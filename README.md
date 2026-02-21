# 🐾 IoT Pet — Dispensador Inteligente de Alimento

Aplicación web para la administración, control y monitoreo en tiempo real de dispensadores de alimento para mascotas conectados mediante IoT.

---

## 📋 Descripción

IoT Pet es una plataforma web que permite gestionar dispensadores de alimento inteligentes. A través de una interfaz moderna y responsiva, el usuario puede registrar dispositivos, controlarlos de forma remota y monitorear su estado en tiempo real, todo respaldado por una API REST en MockAPI.

---

## ✨ Funcionalidades

### 🗂️ Administración
- Alta, edición y eliminación de dispositivos IoT
- Configuración de nombre, estado, modo de operación, nivel de comida y cantidad en gramos
- Tabla con todos los dispositivos registrados

### 🎛️ Control
- Encendido y apagado remoto de cada dispositivo mediante interruptores
- Visualización del estado actual de cada dispositivo en tiempo real

### 📊 Monitoreo
- Gráfica de barras con el nivel de comida de cada dispositivo (Lleno / Medio / Vacío)
- Tabla con los últimos 10 registros de estatus
- Refresco automático cada 2 segundos
- Notificaciones visuales al detectar cambios de nivel

---

## 🧠 Lógica de Modos

| Modo | Descripción |
|---|---|
| **Manual** | El usuario interactúa físicamente con el dispensador. El sistema detecta y registra el cambio de estado desde el hardware. |
| **Inteligente** | El dispositivo se controla de forma remota desde la aplicación web o el celular. |

---

## 🛠️ Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| HTML5 | Estructura de la aplicación |
| Bootstrap 5.3 | Framework CSS para diseño responsivo |
| Font Awesome 6 | Íconos de interfaz |
| Google Fonts (Poppins) | Tipografía |
| Chart.js | Gráfica de monitoreo |
| JavaScript (Vanilla) | Lógica del frontend |
| MockAPI | Base de datos y API REST |

---

## 🌐 API REST — MockAPI

La aplicación consume una API REST alojada en MockAPI con los siguientes endpoints:

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/dispensador_alimento` | Obtener todos los dispositivos |
| POST | `/dispensador_alimento` | Crear un nuevo dispositivo |
| PUT | `/dispensador_alimento/:id` | Actualizar un dispositivo |
| DELETE | `/dispensador_alimento/:id` | Eliminar un dispositivo |

### Estructura de un dispositivo

```json
{
  "id": "1",
  "nombre": "Dispensador Sala",
  "estado": "Encendido",
  "modo": "inteligente",
  "nivel_comida": "Lleno",
  "cantidad": 250,
  "ultima_dispensacion": "2025-01-01T10:00:00.000Z"
}
```

---

## 📁 Estructura del proyecto

```
📦 iot-pet/
├── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── api.js       # Funciones de consumo de API REST
│   │   └── app.js       # Lógica principal de la aplicación
│   └── img/
│       └── icono.png
```

---

## 🚀 Cómo ejecutar el proyecto

1. Clona o descarga el repositorio
2. Abre `index.html` en tu navegador (no requiere servidor local)
3. Asegúrate de tener conexión a internet para consumir la API de MockAPI y cargar los CDN

---

## 👩‍💻 Desarrollado por

**Ing. Jocelin Joanna Sánchez Hernández**