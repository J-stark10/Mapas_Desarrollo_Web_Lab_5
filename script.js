// ===============================
// INICIALIZACIÓN DEL MAPA
// ===============================
const mapa = L.map("mapa").setView([-16.4897, -68.1193], 13);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(mapa);

const info = document.getElementById("info");

mapa.on("click", function (e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  L.marker([lat, lng])
    .addTo(mapa)
    .bindPopup(`Latitud: ${lat.toFixed(6)}<br>Longitud: ${lng.toFixed(6)}`)
    .openPopup();
});

// ===============================
// VARIABLES GLOBALES
// ===============================
// db: instancia de SQLite en memoria
// puntosCoordenadas: almacena puntos capturados en la sesión
let db;
let puntosCoordenadas = [];

// ===============================
// INICIALIZACIÓN DE BASE DE DATOS (SQL.js)
// ===============================
initSqlJs({
  locateFile: (file) =>
    `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`,
}).then((SQL) => {
  db = new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS coordenadas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lat REAL NOT NULL,
      lng REAL NOT NULL
    );
  `);

  console.log("Base de datos en memoria lista");
});

// ===============================
// CAPTURA DE COORDENADAS
// ===============================
mapa.on("click", function (e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  puntosCoordenadas.push({ lat, lng });

  actualizarFilaTabla(lat, lng);
});

const cuerpoTabla = document.getElementById("cuerpoTabla");

// ===============================
// ACTUALIZAR TABLA HTML
// ===============================
function actualizarFilaTabla(lat, lng) {
  const fila = document.createElement("tr");
  const index = puntosCoordenadas.length;

  fila.innerHTML = `
    <td>${index}</td>
    <td>${lat.toFixed(6)}</td>
    <td>${lng.toFixed(6)}</td>
  `;

  cuerpoTabla.appendChild(fila);
}

// ===============================
// GUARDAR COORDENADAS
// ===============================
function guardarCoordenadas() {
  if (!db) {
    alert("Base de datos no inicializada");
    return;
  }

  if (puntosCoordenadas.length === 0) {
    alert("No hay puntos para guardar");
    return;
  }

  puntosCoordenadas.forEach((dato) => {
    db.run("INSERT INTO coordenadas (lat, lng) VALUES (?, ?)", [
      dato.lat,
      dato.lng,
    ]);
  });

  limpiarPuntosCoordenadas();

  alert("Coordenadas almacenadas en la base de datos");
}

// ===============================
// LIMPIAR DATOS TEMPORALES
// ===============================
function limpiarPuntosCoordenadas() {
  puntosCoordenadas = [];
  cuerpoTabla.innerHTML = "";
}

// ===============================
// GENERAR PDF
// ===============================
function generarPDF() {
  if (!db) {
    alert("Base de datos no inicializada");
    return;
  }

  const result = db.exec("SELECT * FROM coordenadas");
  if (!result.length || result[0].values.length === 0) {
    alert("No hay datos en la base de datos");
    return;
  }
  const datos = result[0].values;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const fecha = new Date().toLocaleString();

  // Título del documento
  doc.setFontSize(16);
  doc.text("REPORTE DE COORDENADAS", 105, 15, { align: "center" });

  // Fecha del reporte
  doc.setFontSize(10);
  doc.text(`Fecha / Hora: ${fecha}`, 10, 25);
  // Total de registros
  doc.text(`Total de puntos: ${datos.length}`, 170, 25);

  let y = 40;

  // Encabezado de tabla
  doc.setFillColor(15, 58, 85);
  doc.rect(10, y, 190, 10, "F");

  doc.setTextColor(255, 255, 255);
  doc.text("#", 15, y + 7);
  doc.text("Latitud", 35, y + 7);
  doc.text("Longitud", 110, y + 7);

  y += 10;

  // Filas de datos
  datos.forEach((dato, i) => {
    const [id, lat, lng] = dato;
    y += 10;

    // Fondo alternado
    if (i % 2 === 0) {
      doc.setFillColor(240, 245, 248);
      doc.rect(10, y - 7, 190, 10, "F");
    }

    doc.setTextColor(0, 0, 0);
    doc.text(String(id), 15, y);
    doc.text(Number(lat).toFixed(6), 35, y);
    doc.text(Number(lng).toFixed(6), 110, y);

    // Salto de página
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save("reporte_coordenadas.pdf");
}
