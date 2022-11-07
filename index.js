const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const { exec } = require("child_process");

const db = new sqlite3.Database('facturacion.db');
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "./uploads")
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname)
  }
})

const upload = multer({ storage: storage });

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS emisor (id INTEGER PRIMARY KEY, nombre TEXT, rfc TEXT, regimenFiscal TEXT, codigoPostal TEXT, certificado TEXT, llavePrivada TEXT, contraseña TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY, nombre TEXT, rfc TEXT, regimenFiscal TEXT, codigoPostal TEXT, usoDeCfdi TEXT)");

  // Insert data into the table
  db.run("INSERT INTO emisor (nombre) SELECT '' where not exists (select * from emisor) ");

  db.each("SELECT id, nombre, rfc, regimenFiscal, codigoPostal, certificado, llavePrivada, contraseña FROM emisor", function(err, row) {
    console.log(row.id + ": " + row.nombre + " " + row.rfc + " " + row.regimenFiscal + " " + row.codigoPostal + " " + row.certificado + " " + row.llavePrivada);
  });

  db.each("SELECT id, nombre, rfc, regimenFiscal, codigoPostal, usoDeCfdi FROM clientes", function(err, row) {
    console.log(row.id + ": " + row.nombre + " " + row.rfc + " " + row.regimenFiscal + " " + row.codigoPostal + " " + row.usoDeCfdi);
  });
});

function convertirCertificado(certificado, llavePrivada) {
  exec("openssl pkcs8 -inform DER -in " + llavePrivada + " -out certificado/llavePrivada.pem " + "-passin pass:12345678a", (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });

  exec("openssl x509 -inform DER -outform PEM -in " + certificado + " -out certificado/certificado.pem -pubkey", (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });

  var certPem = "certificado/certificado.pem";
  var llavePrivPem = "certificado/llavePrivada.pem";

  exec("openssl pkcs12 -export -in " + certPem + " -inkey " + llavePrivPem + " -out certificado/privada.pfx -passout pass:12345678a", (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
}

const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.json());

app.get('/emisor', (req, res) => {
  db.get("select * from emisor", [], (err, row) => {
    if (err) {
      console.log(err);
    } else {
      res.render('emisor.ejs', { razonSocial: row.nombre, rfc: row.rfc, codigoPostal: row.codigoPostal, certificado: row.certificado, llavePrivada: row.llavePrivada });
    }
  });
});

app.post('/timbrar', (req, res) => {
  var datos = [];
  datos.push("ok");
  datos.push('<?xmlversion="1.0"encoding="utf-8"?><cfdi:Comprobantexsi:schemaLocation="http://www.sat.gob.mx/cfd/4http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"Version="4.0"Serie="Serie"Folio="Folio"Fecha="2022-07-19T00:18:10"Sello="e"CondicionesDePago="CondicionesDePago"SubTotal="200"Descuento="1"Moneda="AMD"TipoCambio="1"Total="198.96"TipoDeComprobante="I"Exportacion="01"MetodoPago="PPD"FormaPago="99"LugarExpedicion="20000"xmlns:cfdi="http://www.sat.gob.mx/cfd/4"xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><cfdi:EmisorRfc="EKU9003173C9"Nombre="ESCUELAKEMPERURGATE"RegimenFiscal="601"/><cfdi:ReceptorRfc="URE180429TM6"Nombre="UNIVERSIDADROBOTICAESPAÑOLA"DomicilioFiscalReceptor="65000"RegimenFiscalReceptor="601"UsoCFDI="G01"/><cfdi:Conceptos><cfdi:ConceptoClaveProdServ="50211503"Cantidad="1"ClaveUnidad="H87"Unidad="Pieza"Descripcion="Cigarros"ValorUnitario="200.00"Descuento="1"Importe="200.00"ObjetoImp="02"><cfdi:Impuestos><cfdi:Traslados><cfdi:TrasladoBase="1"Importe="0.16"Impuesto="002"TasaOCuota="0.160000"TipoFactor="Tasa"/></cfdi:Traslados><cfdi:Retenciones><cfdi:RetencionBase="1"Impuesto="001"TipoFactor="Tasa"TasaOCuota="0.100000"Importe="0.10"/><cfdi:RetencionBase="1"Impuesto="002"TipoFactor="Tasa"TasaOCuota="0.106666"Importe="0.10"/></cfdi:Retenciones></cfdi:Impuestos></cfdi:Concepto></cfdi:Conceptos><cfdi:ImpuestosTotalImpuestosRetenidos="0.20"TotalImpuestosTrasladados="0.16"><cfdi:Retenciones><cfdi:RetencionImpuesto="001"Importe="0.10"/><cfdi:RetencionImpuesto="002"Importe="0.10"/></cfdi:Retenciones><cfdi:Traslados><cfdi:TrasladoBase="1"Importe="0.16"Impuesto="002"TasaOCuota="0.160000"TipoFactor="Tasa"/></cfdi:Traslados></cfdi:Impuestos></cfdi:Comprobante>');
  console.log(datos);
  res.send(datos);
});

app.post('/guardarEmisor', (req, res) => {
  //let usuario = req.body.emisor;
  db.run("update emisor set nombre = ?,rfc = ?, regimenFiscal = ?, codigoPostal = ?", [req.body.emisor, req.body.rfc, req.body.regimenFiscal, req.body.codigoPostal], (err, row) => {
    if (err) {
      console.log(err);
    } else {
      res.send("ok");
    }
  });
});

app.post('/guardarCliente', (req, res) => {
  console.log(req.body.id);
  console.log(req.body.razonSocial);
  console.log(req.body.rfc);
  console.log(req.body.regimenFiscal);
  console.log(req.body.codigoPostal);
  console.log(req.body.usoDeCfdi);

  db.run("INSERT OR REPLACE INTO clientes (id,nombre,rfc,regimenFiscal,codigoPostal,usoDeCfdi) VALUES ((select id from clientes where id = ?),?, ?, ?, ?, ?)", [req.body.id, req.body.razonSocial, req.body.rfc, req.body.regimenFiscal, req.body.codigoPostal, req.body.usoDeCfdi], (err, row) => {
    if (err) {
      console.log(err);
    } else {
      res.send("ok");
    }
  });
});

app.post('/subirCertificado', upload.fields([{ name: 'cert', maxCount: 1 }, { name: 'llav', maxCount: 1 }]), function(req, res, next) {

  if (req.files['cert'] && req.files['llav']) {
    //console.log(req.files['cert'][0].filename);
    console.log(req.body.contraseña);



    db.run("update emisor set certificado = ?,llavePrivada = ?, contraseña = ?", [req.files['cert'][0].filename, req.files['llav'][0].filename, req.body.contraseña], (err, row) => {
      if (err) {
        console.log(err);
      } else {
        var certificado = "uploads/" + req.files['cert'][0].filename;
        var llavePrivada = "uploads/" + req.files['llav'][0].filename;
        convertirCertificado(certificado, llavePrivada);
        res.send("ok");
      }
    });



  }
});

app.post('/cargarClientes', (req, res) => {

  db.all("SELECT id, nombre, rfc, regimenFiscal, codigoPostal, usoDeCfdi FROM clientes", function(err, rows) {
    var text = "";
    rows.forEach(function(row) {
      //console.log(row.id + ": " + row.nombre + " " + row.rfc + " " + row.regimenFiscal + " " + row.codigoPostal + " " + row.usoDeCfdi);

      text += '<tr id="' + row.id + '" nombre="' + row.nombre + '" rfc="' + row.rfc + '" regimenFiscal="' + row.regimenFiscal + '" codigoPostal="' + row.codigoPostal + '" usoDeCfdi="' + row.usoDeCfdi + '">'
        + '<td>' + row.nombre + '</td>' + '<td>' + row.rfc + '</td></tr>';
    })


    res.send(text);
  });


});


app.get('/clientes', (req, res) => {
  res.render('clientes.ejs');
});

app.get('/', (req, res) => {
  db.all("select * from clientes", [], (err1, rows) => {
    if (err1) {
      console.log(err1);
    } else {

      var text = "";

      rows.forEach(function(row) {
        text += '<option rfc="' + row.rfc + '" regimenFiscal="' + row.regimenFiscal + '" codigoPostal="' + row.codigoPostal + '" value="' + row.id + '">' + row.nombre + '</option>';
      });

      db.get("select * from emisor", [], (err, row) => {
        if (err) {
          console.log(err);
        } else {
          res.render('index.ejs', { razonSocial: row.nombre, rfc: row.rfc, regimenFiscal: row.regimenFiscal, codigoPostal: row.codigoPostal, clientes: text });
        }
      });
    }
  });
});

app.listen(3000, () => {
  console.log('SE HA INICIADO EL SERVIDOR');
});