const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('facturacion.db');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS emisor (id INTEGER PRIMARY KEY, nombre TEXT, rfc TEXT, regimenFiscal TEXT, codigoPostal TEXT, certificado TEXT, llavePrivada TEXT, contraseña TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY, nombre TEXT, rfc TEXT)");

  // Insert data into the table
  /*db.run("INSERT INTO emisor (nombre,rfc,regimenFiscal,codigoPostal) VALUES ('XOCHILT CASAS CHAVEZ', 'CACX7605101P8', '621', '10740')");*/

  db.each("SELECT id, nombre, rfc, regimenFiscal, codigoPostal FROM emisor", function(err, row) {
    console.log(row.id + ": " + row.nombre + " " + row.rfc + " " + row.regimenFiscal + " " + row.codigoPostal);
  });
});

const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.json());

app.get('/emisor', (req, res) => {
  db.get("select * from emisor", [], (err, row) => {
    if (err) {
      console.log(err);
    } else {
      res.render('emisor.ejs', { razonSocial: row.nombre, rfc: row.rfc, codigoPostal: row.codigoPostal });
    }
  });
});

app.post('/guardarEmisor', (req, res) => {
  //let usuario = req.body.emisor;
  db.run("update emisor set nombre = ?", [req.body.emisor], (err, row) => {
    if (err) {
      console.log(err);
    } else {
      res.send("ok");
    }
  });
});

app.get('/clientes', (req, res) => {
  res.render('clientes.ejs');
});

app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.listen(3000, () => {
  console.log('server started');
});