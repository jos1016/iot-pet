let editandoId = null;
let intervalo = null;
let chart = null;

document.addEventListener("DOMContentLoaded", () => {
    cargarAdmin();
    iniciarMonitoreo();
});

function mostrarPanel(panel) {
    document.getElementById("panel-admin").classList.add("d-none");
    document.getElementById("panel-control").classList.add("d-none");
    document.getElementById("panel-monitoreo").classList.add("d-none");

    document.getElementById("panel-" + panel).classList.remove("d-none");

    if (panel === "control") cargarControl();
    if (panel === "monitoreo") iniciarMonitoreo();
}

async function cargarAdmin() {
    const tabla = document.getElementById("tablaDispositivos");
    const data = await getDispositivos();

    tabla.innerHTML = data.map(d => `
        <tr class="fade-in-up">
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

async function cargarControl() {
    const data = await getDispositivos();
    const contenedor = document.getElementById("contenedorControl");

    contenedor.innerHTML = data.map(d => `
        <div class="col-md-4 fade-in-up">
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

function iniciarMonitoreo() {
    if (intervalo) clearInterval(intervalo);
    cargarMonitoreo();
    intervalo = setInterval(cargarMonitoreo, 2000);
}

async function cargarMonitoreo() {
    const data = await getDispositivos();
    const tabla = document.getElementById("tablaMonitoreo");

    const ultimos = data.slice(0, 10);

    tabla.innerHTML = ultimos.map(d => `
        <tr class="fade-in-up">
            <td>${d.nombre}</td>
            <td class="${d.estado === "Encendido" ? "estado-encendido" : "estado-apagado"}">
                ${d.estado}
            </td>
            <td>${d.nivel_comida}</td>
            <td>${new Date(d.ultima_dispensacion).toLocaleTimeString()}</td>
        </tr>
    `).join('');

    actualizarGrafica(ultimos);
}

function actualizarGrafica(data) {
    const ctx = document.getElementById("grafica");

    const niveles = data.map(d =>
        d.nivel_comida === "Lleno" ? 100 :
        d.nivel_comida === "Medio" ? 50 : 10
    );

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: data.map(d => d.nombre),
            datasets: [{
                label: "Nivel de comida (%)",
                data: niveles,
                backgroundColor: "#00f2ff"
            }]
        },
        options: {
            plugins: {
                legend: {
                    labels: { color: "white" }
                }
            },
            scales: {
                x: { ticks: { color: "white" } },
                y: { ticks: { color: "white" } }
            }
        }
    });
}
