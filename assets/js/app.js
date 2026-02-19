let dispositivos = [];
let indice = 0;
let intervaloMonitoreo = null;
let chart = null;
let editandoId = null;

document.addEventListener("DOMContentLoaded", () => {
    cargarAdmin();
});


// ============================
// NAVEGACIÓN
// ============================

function mostrarPanel(panel) {

    document.getElementById("panel-admin").classList.add("d-none");
    document.getElementById("panel-control").classList.add("d-none");
    document.getElementById("panel-monitoreo").classList.add("d-none");

    document.getElementById("panel-" + panel).classList.remove("d-none");

    if (panel === "admin") cargarAdmin();
    if (panel === "control") cargarControl();

    if (panel === "monitoreo") {
        iniciarMonitoreo();
    } else {
        if (intervaloMonitoreo) clearInterval(intervaloMonitoreo);
    }
}


// ============================
// ADMINISTRACIÓN
// ============================

async function cargarAdmin() {

    const tabla = document.getElementById("tablaDispositivos");
    const data = await getDispositivos();

    tabla.innerHTML = data.map(d => `
        <tr>
            <td>${d.nombre}</td>
            <td class="${d.estado === "Encendido" ? "estado-encendido" : "estado-apagado"}">
                ${d.estado}
            </td>
            <td>${d.modo}</td>
            <td>${d.nivel_comida}</td>
            <td>${d.cantidad}g</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="editar('${d.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="eliminar('${d.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

document.getElementById("formDispositivo").addEventListener("submit", async (e) => {

    e.preventDefault();

    const nuevo = {
        nombre: nombre.value,
        estado: estado.value,
        modo: modo.value,
        nivel_comida: nivel.value,
        cantidad: Number(cantidad.value),
        ultima_dispensacion: new Date().toISOString()
    };

    if (editandoId) {
        await actualizarDispositivo(editandoId, nuevo);
        editandoId = null;
    } else {
        await crearDispositivo(nuevo);
    }

    e.target.reset();
    cargarAdmin();
});

async function eliminar(id) {
    await eliminarDispositivo(id);
    cargarAdmin();
}

async function editar(id) {

    const data = await getDispositivos();
    const d = data.find(x => x.id === id);

    nombre.value = d.nombre;
    estado.value = d.estado;
    modo.value = d.modo;
    nivel.value = d.nivel_comida;
    cantidad.value = d.cantidad;

    editandoId = id;
}


// ============================
// CONTROL
// ============================

async function cargarControl() {

    const data = await getDispositivos();
    const contenedor = document.getElementById("contenedorControl");

    contenedor.innerHTML = data.map(d => `
        <div class="col-md-4">
            <div class="card p-4">
                <h5>${d.nombre}</h5>
                <p class="${d.estado === "Encendido" ? "estado-encendido" : "estado-apagado"}">
                    ${d.estado}
                </p>
                <button class="btn ${d.estado === "Encendido" ? "btn-danger" : "btn-success"} btn-sm"
                    onclick="toggleEstado('${d.id}', '${d.estado}')">
                    ${d.estado === "Encendido" ? "Apagar" : "Encender"}
                </button>
            </div>
        </div>
    `).join('');
}

async function toggleEstado(id, estadoActual) {

    const nuevoEstado = estadoActual === "Encendido" ? "Apagado" : "Encendido";

    await actualizarDispositivo(id, { estado: nuevoEstado });

    cargarControl();
    cargarAdmin();
}


// ============================
// MONITOREO
// ============================

async function iniciarMonitoreo() {

    if (intervaloMonitoreo) clearInterval(intervaloMonitoreo);

    dispositivos = await getDispositivos();
    indice = 0;

    if (!chart) crearGrafica();

    intervaloMonitoreo = setInterval(() => {
        insertarFila();
    }, 2000);
}


function insertarFila() {

    if (dispositivos.length === 0) return;

    const dispositivo = dispositivos[indice];
    const tbody = document.getElementById("tablaMonitoreo");

    const fila = document.createElement("tr");

    const fechaHora = new Date().toLocaleString();

    fila.innerHTML = `
        <td>${dispositivo.nombre}</td>
        <td class="${dispositivo.estado === "Encendido" ? "estado-encendido" : "estado-apagado"}">
            ${dispositivo.estado}
        </td>
        <td>${dispositivo.nivel_comida}</td>
        <td>${fechaHora}</td>
    `;

    // Insertar arriba
    tbody.insertBefore(fila, tbody.firstChild);

    // Mantener solo 10 visibles
    if (tbody.rows.length > 10) {
        tbody.deleteRow(10);
    }

    actualizarGrafica(dispositivo);

    indice++;
    if (indice >= dispositivos.length) indice = 0;
}


// ============================
// GRÁFICA
// ============================

function crearGrafica() {

    const ctx = document.getElementById("grafica").getContext("2d");

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Nivel de comida (%)",
                data: [],
                borderWidth: 2,
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400 },
            plugins: {
                legend: { labels: { color: "white" } }
            },
            scales: {
                x: { ticks: { color: "white" } },
                y: {
                    ticks: { color: "white" },
                    min: 0,
                    max: 100
                }
            }
        }
    });
}


function actualizarGrafica(dispositivo) {

    const nivel =
        dispositivo.nivel_comida === "Lleno" ? 100 :
        dispositivo.nivel_comida === "Medio" ? 50 : 10;

    chart.data.labels.unshift(new Date().toLocaleTimeString());
    chart.data.datasets[0].data.unshift(nivel);

    if (chart.data.labels.length > 10) {
        chart.data.labels.pop();
        chart.data.datasets[0].data.pop();
    }

    chart.update();
}
