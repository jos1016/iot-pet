let dispositivos = [];
let historialPorDispositivo = {};
let intervaloMonitoreo = null;
let chart = null;
let editandoId = null;
let lastNotificationState = {};
let nivelAnterior = {};

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

    if (panel === "admin")     cargarAdmin();
    if (panel === "control")   cargarControl();
    if (panel === "monitoreo") iniciarMonitoreo();
    else if (intervaloMonitoreo) {
        clearInterval(intervaloMonitoreo);
        intervaloMonitoreo = null;
    }
}

// ============================
// ADMINISTRACIÓN
// ============================

async function cargarAdmin() {
    const tabla = document.getElementById("tablaDispositivos");
    const data  = await getDispositivos();
    dispositivos = data;

    tabla.innerHTML = data.map(d => `
        <tr>
            <td>${d.nombre}</td>
            <td class="${d.estado === "Encendido" ? "estado-encendido" : "estado-apagado"}">${d.estado}</td>
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
        nombre:       document.getElementById("nombre").value,
        estado:       document.getElementById("estado").value,
        modo:         document.getElementById("modo").value,
        nivel_comida: document.getElementById("nivel").value,
        cantidad:     Number(document.getElementById("cantidad").value)
    };
    if (editandoId) {
        await actualizarDispositivo(editandoId, nuevo);
        editandoId = null;
    } else {
        nuevo.ultima_dispensacion = new Date().toISOString();
        await crearDispositivo(nuevo);
    }
    e.target.reset();
    cargarAdmin();
});

async function eliminar(id) {
    if (!confirm("¿Seguro que deseas eliminar este dispositivo?")) return;
    await eliminarDispositivo(id);
    delete historialPorDispositivo[id];
    delete nivelAnterior[id];
    cargarAdmin();
}

async function editar(id) {
    const data = await getDispositivos();
    const d    = data.find(x => x.id === id);
    document.getElementById("nombre").value   = d.nombre;
    document.getElementById("estado").value   = d.estado;
    document.getElementById("modo").value     = d.modo;
    document.getElementById("nivel").value    = d.nivel_comida;
    document.getElementById("cantidad").value = d.cantidad;
    editandoId = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================
// CONTROL — solo nombre, estado y botón
// ============================

async function cargarControl() {
    const data       = await getDispositivos();
    const contenedor = document.getElementById("contenedorControl");

    contenedor.innerHTML = data.map(d => `
        <div class="col-md-4">
            <div class="card p-4 mb-3 text-center">
                <h5 class="mb-3">${d.nombre}</h5>
                <p class="${d.estado === "Encendido" ? "estado-encendido" : "estado-apagado"} mb-4">
                    <i class="fas fa-circle me-1"></i>${d.estado}
                </p>
                <button class="btn ${d.estado === "Encendido" ? "btn-danger" : "btn-success"} w-100"
                    onclick="toggleEstado('${d.id}', '${d.estado}')">
                    ${d.estado === "Encendido" ? "⏻ Apagar" : "⏻ Encender"}
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
    document.getElementById("tablaMonitoreo").innerHTML = "";

    dispositivos.forEach(d => {
        nivelAnterior[d.id] = d.nivel_comida;
        if (!historialPorDispositivo[d.id]) historialPorDispositivo[d.id] = [];
    });

    if (chart) { chart.destroy(); chart = null; }
    crearGrafica();

    ejecutarCicloMonitoreo();
    intervaloMonitoreo = setInterval(ejecutarCicloMonitoreo, 2000);
}

async function ejecutarCicloMonitoreo() {
    const datosActuales = await getDispositivos();
    const fechaHora     = new Date().toLocaleString('es-MX');

    for (const d of datosActuales) {
        const nivelPrev = nivelAnterior[d.id];
        const nivelAct  = d.nivel_comida;

        // Detectar cambio real de nivel → registrar dispensación
        const seLleno   = nivelPrev !== undefined && nivelPrev !== "Lleno" && nivelAct === "Lleno";
        const bajoNivel =
            (nivelPrev === "Lleno"  && (nivelAct === "Medio" || nivelAct === "Vacio")) ||
            (nivelPrev === "Medio"  && nivelAct === "Vacio");

        if (seLleno || bajoNivel) {
            const ts = new Date().toISOString();
            await actualizarDispositivo(d.id, { ultima_dispensacion: ts });
            d.ultima_dispensacion = ts;
        }

        nivelAnterior[d.id] = nivelAct;

        if (!historialPorDispositivo[d.id]) historialPorDispositivo[d.id] = [];
        historialPorDispositivo[d.id].unshift({
            nombre: d.nombre,
            estado: d.estado,
            nivel:  nivelAct,
            fecha:  fechaHora,
            ultimaDispensacion: d.ultima_dispensacion
        });
        if (historialPorDispositivo[d.id].length > 10) historialPorDispositivo[d.id].pop();
    }

    dispositivos = datosActuales;

    // Gráfica actualiza inmediato
    actualizarGrafica();

    // Alertas
    verificarAlertas(dispositivos);

    // Tabla anima en paralelo sin bloquear
    animarFilasTabla(dispositivos);
}

function animarFilasTabla(datos) {
    datos.forEach((d, i) => {
        setTimeout(() => {
            const reg = historialPorDispositivo[d.id]?.[0];
            if (reg) agregarFilaAnimada(reg);
        }, i * 500);
    });
}

// ============================
// TABLA ANIMADA
// ============================

function agregarFilaAnimada(reg) {
    const tbody = document.getElementById("tablaMonitoreo");
    const ultimaFecha = reg.ultimaDispensacion
        ? new Date(reg.ultimaDispensacion).toLocaleString('es-MX')
        : "Sin registro";

    const row = document.createElement("tr");
    row.classList.add("push-in");
    row.innerHTML = `
        <td>${reg.nombre}</td>
        <td class="${reg.estado === "Encendido" ? "estado-encendido" : "estado-apagado"}">${reg.estado}</td>
        <td>${reg.nivel}</td>
        <td>${ultimaFecha}</td>
    `;
    tbody.prepend(row);
    while (tbody.children.length > 10) tbody.lastElementChild.remove();
}

// ============================
// NOTIFICACIONES
// ============================

function verificarAlertas(dispositivos) {
    dispositivos.forEach(d => {
        const nivel  = d.nivel_comida;
        const estado = d.estado;
        const last   = lastNotificationState[d.id];
        if (nivel === last) return;

        if (nivel === "Vacio") {
            const consejo = estado === "Apagado"
                ? "Enciende el dispensador para rellenarlo."
                : "Revisa el suministro.";
            mostrarNotificacion(`🔴 <strong>${d.nombre}</strong> está VACÍO. ${consejo}`, "danger");
        } else if (nivel === "Medio") {
            mostrarNotificacion(`🔸 <strong>${d.nombre}</strong> está a nivel MEDIO.`, "warning");
        } else if (nivel === "Lleno") {
            const consejo = estado === "Encendido" ? "Puedes apagarlo ahora." : "Ya está apagado. ✓";
            mostrarNotificacion(`✅ <strong>${d.nombre}</strong> está LLENO. ${consejo}`, "success");
        }
        lastNotificationState[d.id] = nivel;
    });
}

function mostrarNotificacion(mensaje, tipo = "info") {
    const container = document.getElementById("notification-container");
    const toast     = document.createElement("div");
    toast.className = `toast-notification ${tipo}`;
    let icon = "ℹ️";
    if (tipo === "success") icon = "✅";
    if (tipo === "danger")  icon = "⚠️";
    if (tipo === "warning") icon = "🔸";
    toast.innerHTML = `<span class="icon">${icon}</span><span class="message">${mensaje}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "slideOutRight 0.4s ease-in forwards";
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ============================
// GRÁFICA DE BARRAS (original)
// Una barra por dispositivo, color según nivel
// ============================

function crearGrafica() {
    const ctx = document.getElementById("grafica").getContext("2d");

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels:   dispositivos.map(d => d.nombre),
            datasets: [{
                label:           "Nivel de Comida",
                data:            dispositivos.map(d => nivelAValor(d.nivel_comida)),
                backgroundColor: dispositivos.map(d => nivelAColor(d.nivel_comida)),
                borderColor:     "#ffffff",
                borderWidth:     1
            }]
        },
        options: {
            responsive:          true,
            maintainAspectRatio: false,
            animation:           { duration: 500 },
            plugins: {
                legend: { labels: { color: "white" } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val   = context.raw;
                            const label = val === 100 ? "Lleno" : val === 50 ? "Medio" : "Vacío";
                            return `Nivel: ${label} (${val}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: "white" },
                    grid:  { color: "rgba(255,255,255,0.1)" }
                },
                y: {
                    ticks: {
                        color: "white",
                        callback: function(value) {
                            if (value === 100) return "Lleno";
                            if (value === 50)  return "Medio";
                            if (value === 10)  return "Vacío";
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

function actualizarGrafica() {
    if (!chart) return;

    chart.data.labels                            = dispositivos.map(d => d.nombre);
    chart.data.datasets[0].data                 = dispositivos.map(d => nivelAValor(d.nivel_comida));
    chart.data.datasets[0].backgroundColor      = dispositivos.map(d => nivelAColor(d.nivel_comida));

    chart.update();
}

// ============================
// HELPERS
// ============================

function nivelAValor(nivel) {
    if (nivel === "Lleno") return 100;
    if (nivel === "Medio") return 50;
    return 10;
}

function nivelAColor(nivel) {
    if (nivel === "Lleno") return "#00ff88";
    if (nivel === "Medio") return "#FFCE56";
    return "#ff4b6b";
}