
let editandoId = null;

// MODO LOCAL - APP SIMPLIFICADA
let chartInstance = null;
let intervalo = null;

// Exponer globalmente
window.toggle = toggle;
window.eliminar = eliminar;

document.addEventListener("DOMContentLoaded", () => {
    cargarAdmin();
    
});

// NAVEGACIÓN
function mostrarPanel(panel) {

    // Ocultar todos
    document.getElementById("panel-admin").classList.add("d-none");
    document.getElementById("panel-control").classList.add("d-none");
    document.getElementById("panel-monitoreo").classList.add("d-none");

    // Mostrar el panel seleccionado
    const active = document.getElementById("panel-" + panel);
    active.classList.remove("d-none");

    // Si entramos a monitoreo → iniciar intervalo
    if (panel === "monitoreo") {
        iniciarMonitoreo();
    } 
    // Si salimos de monitoreo → detener intervalo
    else {
        clearInterval(intervalo);
    }

    if (panel === "control") {
        cargarControl();
    }
}


// ADMIN
async function cargarAdmin() {
    const data = await getDispositivos();
    const tabla = document.getElementById("tablaAdmin");
    tabla.innerHTML = data.map(d => `
        <tr>
            <td>${d.nombre}</td>
            <td>${d.estado}</td>
            <td>${d.modo}</td>
            <td>${d.nivel_comida}</td>
            <td>${d.cantidad}g</td>
            <td>
    <button class="btn btn-warning btn-sm" onclick="editar('${d.id}')">Editar</button>
    <button class="btn btn-danger btn-sm" onclick="eliminar('${d.id}')">Eliminar</button>
</td>

        </tr>
    `).join('');
}

document.getElementById("formDispositivo").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nuevo = {
        nombre: document.getElementById("nombre").value,
        estado: document.getElementById("estado").value,
        modo: document.getElementById("modo").value,
        nivel_comida: document.getElementById("nivel").value,
        cantidad: Number(document.getElementById("cantidad").value),
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
    const dispositivo = data.find(d => d.id === id);

    document.getElementById("nombre").value = dispositivo.nombre;
    document.getElementById("estado").value = dispositivo.estado;
    document.getElementById("modo").value = dispositivo.modo;
    document.getElementById("nivel").value = dispositivo.nivel_comida;
    document.getElementById("cantidad").value = dispositivo.cantidad;

    editandoId = id;
}

// CONTROL
async function cargarControl() {
    const data = await getDispositivos();
    const cont = document.getElementById("contenedorControl");
    cont.innerHTML = data.map(d => `
        <div class="col-md-4">
            <div class="card p-3 shadow">
                <h5>${d.nombre}</h5>
                <p>Estado: <strong class="${d.estado === 'Encendido' ? 'text-success' : 'text-danger'}">${d.estado}</strong></p>
                <button class="btn btn-${d.estado === "Encendido" ? "danger" : "success"} w-100"
                    onclick="toggle('${d.id}','${d.estado}')">
                    ${d.estado === "Encendido" ? "Apagar" : "Encender"}
                </button>
            </div>
        </div>
    `).join('');
}

async function toggle(id, estadoActual) {
    const nuevo = estadoActual === "Encendido" ? "Apagado" : "Encendido";
    await actualizarDispositivo(id, { estado: nuevo });
    cargarControl();
    // Actualizamos admin también por si acaso cambian de pestaña rápido
    cargarAdmin();
}

// MONITOREO
function iniciarMonitoreo() {
    clearInterval(intervalo);
    cargarMonitoreo();
    intervalo = setInterval(cargarMonitoreo, 2000);
}

async function cargarMonitoreo() {
    const data = await getDispositivos();

    // Tabla
    const tabla = document.getElementById("tablaMonitoreo");
    if (tabla) {
        tabla.innerHTML = data.slice(-10).map(d => `
            <tr>
                <td>${d.nombre}</td>
                <td><span class="${d.estado === 'Encendido' ? 'estado-encendido' : 'estado-apagado'}">${d.estado}</span></td>
                <td>${d.nivel_comida}</td>
                <td>${new Date().toLocaleTimeString()}</td>

            </tr>
        `).join('');
    }

    // Gráfica
    actualizarGrafica(data);
}

function actualizarGrafica(data) {
    if (typeof Chart === 'undefined') return;

    // 1. LIMPIEZA NUCLEAR: Eliminar el canvas viejo del DOM para borrar cualquier rastro de memoria
    const container = document.getElementById("grafica-container");
    if (!container) return;

    // Destruir instancia previa si existe
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    // Limpiar contenedor (elimina el <canvas> viejo)
    container.innerHTML = "";

    // 2. CREACIÓN: Generar un nuevo canvas fresco
    const newCanvas = document.createElement("canvas");
    newCanvas.id = "grafica";
    container.appendChild(newCanvas);

    const labels = data.map(d => d.nombre);
    const values = data.map(d => d.cantidad || 0);
    const maxVal = Math.max(...values, 1000); // Tope dinámico mínimo de 1000g

    // 3. RENDERIZADO
    const ctx = newCanvas.getContext("2d");
    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Nivel de Comida (g)",
                data: values, // El valor real
                backgroundColor: values.map(v => v > 800 ? '#00ff88' : (v > 300 ? '#00f2ff' : '#ff4b6b')), // Color dinámico según nivel
                borderColor: '#ffffff',
                borderWidth: 1,
                borderRadius: 4,
                barPercentage: 0.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // Ocultamos leyenda para limpieza
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    titleColor: '#fff',
                    bodyFont: { size: 14 }
                },
                // Plugin personalizado para mostrar el valor ARRIBA de la barra (el "marcador/contador")
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: Math.round,
                    font: { weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1200, // TOPE FIJO VISUAL (para que la barra no crezca infinitamente)
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#aaa', font: { family: 'Poppins' } },
                    border: { display: false }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#fff', font: { family: 'Poppins' } },
                    border: { display: false }
                }
            },
            animation: {
                duration: 0 // Cero animación para actualizaciones instantáneas
            }
        }
    });
}
