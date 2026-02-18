const API_URL = "https://698a179bc04d974bc6a154af.mockapi.io/api/v1/dispensador_alimento";

async function getDispositivos() {
    const res = await fetch(API_URL);
    return await res.json();
}

async function crearDispositivo(data) {
    const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return await res.json();
}

async function actualizarDispositivo(id, data) {
    await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
}

async function eliminarDispositivo(id) {
    await fetch(`${API_URL}/${id}`, {
        method: "DELETE"
    });
}
