let dispositivos = [];
let historialGlobal = [];
let intervaloMonitoreo = null;
let chart = null;
let editandoId = null;
let lastNotificationState = {}; // Store last notified level for each device

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

    if (panel === "monitoreo") iniciarMonitoreo();
    else if (intervaloMonitoreo) clearInterval(intervaloMonitoreo);
}

// ============================
// ADMINISTRACIÓN
// ============================

async function cargarAdmin() {
    const tabla = document.getElementById("tablaDispositivos");
    const data = await getDispositivos();
    dispositivos = data;

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
    const d = data.find(x => x.id === id);

    document.getElementById("nombre").value = d.nombre;
    document.getElementById("estado").value = d.estado;
    document.getElementById("modo").value = d.modo;
    document.getElementById("nivel").value = d.nivel_comida;
    document.getElementById("cantidad").value = d.cantidad;

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

    // Reiniciar historial visual
    const tbody = document.getElementById("tablaMonitoreo");
    tbody.innerHTML = "";

    if (chart) chart.destroy();
    crearGrafica();

    // Primera ejecución
    await ejecutarCicloMonitoreo();

    // Ciclo repetitivo (4s para dar tiempo a animaciones)
    intervaloMonitoreo = setInterval(ejecutarCicloMonitoreo, 2000);
}

async function ejecutarCicloMonitoreo() {
    dispositivos = await getDispositivos();
    // SHOW DATE AND TIME
    const fechaHora = new Date().toLocaleString();

    // Preparar nuevos registros
    const nuevosRegistros = dispositivos.map(d => ({
        id: d.id,
        nombre: d.nombre,
        estado: d.estado,
        nivel: d.nivel_comida,
        fecha: fechaHora
    }));

    // Verificar Alertas
    verificarAlertas(dispositivos);

    // Insertar uno por uno con delay
    for (const reg of nuevosRegistros) {
        agregarFilaAnimada(reg);
        await new Promise(r => setTimeout(r, 500)); // 0.5s delay entre cada fila
    }

    actualizarGraficaTodos();
}
function actualizarTablaMonitoreo(datos) {

    const tabla = document.getElementById("tablaMonitoreo");

    // Creamos todo el HTML en memoria primero
    let html = "";

    datos.forEach(d => {

        const fecha = d.ultimaDispensacion
            ? new Date(d.ultimaDispensacion).toLocaleString()
            : "Sin registro";

        html += `
            <tr>
                <td>${d.nombre}</td>
                <td>${d.estado}</td>
                <td>${d.nivel}</td>
                <td>${fecha}</td>
            </tr>
        `;
    });

    // Lo insertamos TODO de golpe (sin efecto progresivo)
    tabla.innerHTML = html;
}

function agregarFilaAnimada(registro) {
    const tbody = document.getElementById("tablaMonitoreo");

    // Crear fila
    const row = document.createElement("tr");
    row.classList.add("push-in");
    row.innerHTML = `
        <td>${registro.nombre}</td>
        <td class="${registro.estado === "Encendido" ? "estado-encendido" : "estado-apagado"}">
            ${registro.estado}
        </td>
        <td>${registro.nivel}</td>
        <td>${registro.fecha}</td>
    `;

    // Insertar al principio (Push effect)
    tbody.prepend(row);

    // Mantener limite de 10 en el DOM (elimina el último)
    if (tbody.children.length > 10) {
        tbody.lastElementChild.remove();
    }
}

// ============================
// NOTIFICACIONES
// ============================

function verificarAlertas(dispositivos) {
    dispositivos.forEach(d => {
        const nivel = d.nivel_comida; // "Lleno", "Medio", "Vacio"
        const last = lastNotificationState[d.id];

        // Solo notificar si el estado ha cambiado
        if (nivel !== last) {
            if (nivel === "Vacio") {
                mostrarNotificacion(`⚠️ <strong>${d.nombre}</strong> está VACÍO. Por favor rellénalo.`, "danger");
            } else if (nivel === "Lleno") {
                mostrarNotificacion(`✅ <strong>${d.nombre}</strong> está LLENO.`, "success");
            } else if (nivel === "Medio" && last === "Lleno") {
                // Opcional: Notificar cuando baja a medio
                // mostrarNotificacion(`ℹ️ ${d.nombre} está a medio nivel.`, "warning");
            }

            // Actualizar estado
            lastNotificationState[d.id] = nivel;
        }
    });
}

function mostrarNotificacion(mensaje, tipo = "info") {
    const container = document.getElementById("notification-container");
    const toast = document.createElement("div");

    toast.className = `toast-notification ${tipo}`;

    let icon = "ℹ️";
    if (tipo === "success") icon = "✅";
    if (tipo === "danger") icon = "⚠️";
    if (tipo === "warning") icon = "🔸";

    toast.innerHTML = `
        <span class="icon">${icon}</span>
        <span class="message">${mensaje}</span>
    `;

    container.appendChild(toast);

    // Remover después de 3 segundos
    setTimeout(() => {
        toast.style.animation = "slideOutRight 0.4s ease-in forwards";
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}


// ============================
// GRÁFICA
// ============================

function crearGrafica() {
    const ctx = document.getElementById("grafica").getContext("2d");

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: dispositivos.map(d => d.nombre),
            datasets: [{
                label: "Nivel de Comida",
                data: dispositivos.map(d => d.nivel_comida === "Lleno" ? 100 : d.nivel_comida === "Medio" ? 50 : 10),
                backgroundColor: dispositivos.map(d => {
                    if (d.nivel_comida === "Lleno") return "#00ff88"; // Green
                    if (d.nivel_comida === "Medio") return "#FFCE56"; // Yellow
                    return "#ff4b6b"; // Red
                }),
                borderColor: "#ffffff",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 500
            },
            plugins: {
                legend: { labels: { color: "white" } },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const val = context.raw;
                            let label = val === 100 ? "Lleno" : val === 50 ? "Medio" : "Vacio";
                            return `Nivel: ${label} (${val}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: "white" },
                    grid: { color: "rgba(255,255,255,0.1)" }
                },
                y: {
                    ticks: {
                        color: "white",
                        callback: function (value) {
                            if (value === 100) return "Lleno";
                            if (value === 50) return "Medio";
                            if (value === 10) return "Vacio";
                            return "";
                        }
                    },
                    min: 0,
                    max: 100,
                    grid: { color: "rgba(255,255,255,0.1)" }
                }
            }
        }
    });
}

function actualizarGraficaTodos() {
    if (!chart) return;

    // Update labels
    chart.data.labels = dispositivos.map(d => d.nombre);

    // Update data
    const newData = dispositivos.map(d => {
        return d.nivel_comida === "Lleno" ? 100 : d.nivel_comida === "Medio" ? 50 : 10;
    });

    const newColors = dispositivos.map(d => {
        if (d.nivel_comida === "Lleno") return "#00ff88";
        if (d.nivel_comida === "Medio") return "#FFCE56";
        return "#ff4b6b";
    });

    chart.data.datasets[0].data = newData;
    chart.data.datasets[0].backgroundColor = newColors;

    chart.update();
}
