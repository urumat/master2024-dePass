const express = require("express");
const { MongoClient } = require("mongodb");
const { ethers } = require("ethers");
require("dotenv").config();
const DePass_abi = require('../mwallet/src/contracts/DePassPassword_abi.json');

const app = express();
const cors = require("cors");
const port = 3001;

app.use(cors());

const provider = new ethers.providers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
const contractAddress = process.env.BASE_SEPOLIA_CONTRACT_ADDRESS;
const contract = new ethers.Contract(contractAddress, DePass_abi, provider);

let db;
const client = new MongoClient(process.env.MONGO_URI);

// Conectar a MongoDB y asegurar índices en base a los parámetros indexados del contrato
async function connectDB() {
  await client.connect();
  db = client.db("logsDB");

  const indexedFields = getIndexedFieldsFromABI(DePass_abi);
  for (const field of indexedFields) {
    const index = {};
    index[field] = 1;
    await db.collection("events").createIndex(index);
  }

  // Crear un índice único en transactionHash y logIndex para evitar duplicados
  await db.collection("events").createIndex({ transactionHash: 1, logIndex: 1 }, { unique: true });

  console.log("Connected to MongoDB and ensured dynamic indexes.");
}

// Extraer campos indexados del ABI
function getIndexedFieldsFromABI(abi) {
  const indexedFields = new Set();

  abi.forEach(item => {
    if (item.type === "event") {
      item.inputs.forEach(input => {
        if (input.indexed) {
          indexedFields.add(input.name); // Almacena cada campo indexado en el conjunto
        }
      });
    }
  });

  return Array.from(indexedFields); // Convertir el conjunto a array
}

// Guardar log de evento en MongoDB
async function saveEventLog(eventData) {
  try {
    // Intentar insertar el evento; MongoDB ignorará duplicados si transactionHash y logIndex ya existen
    await db.collection("events").insertOne({
      ...eventData,
      timestamp: new Date()  // Añadir marca de tiempo de almacenamiento
    });
    console.log("Evento guardado");
  } catch (error) {
    if (error.code === 11000) {
      // Error de duplicado, el evento ya existe
      console.log("Evento duplicado ignorado:", eventData.eventType, "transactionHash:", eventData.transactionHash, "logIndex:", eventData.logIndex);
    } else {
      // Cualquier otro error se registra para su revisión
      console.error("Error al guardar el evento:", error);
    }
  }
}

// Obtener el último bloque procesado desde MongoDB
async function getLastProcessedBlock() {
  const result = await db.collection("metadata").findOne({ type: "lastProcessedBlock" });
  return result ? result.blockNumber : 0;
}

// Actualizar el último bloque procesado en MongoDB
async function updateLastProcessedBlock(blockNumber) {
  await db.collection("metadata").updateOne(
    { type: "lastProcessedBlock" },
    { $set: { blockNumber: blockNumber } },
    { upsert: true }
  );
}

// Inicializar logs desde el último bloque procesado y guardar todos los eventos
async function initializeLogs() {
  const lastProcessedBlock = await getLastProcessedBlock();
  const currentBlock = await provider.getBlockNumber();
  const filter = {};  // Filtro vacío para capturar todos los eventos
  console.log(`Inicializando desde el bloque: ${lastProcessedBlock}`);
  const events = await contract.queryFilter(filter, lastProcessedBlock + 1, currentBlock);

  for (const event of events) {
    await saveEventLog({
      eventType: event.event,  // Tipo de evento (por ejemplo, "CredentialLogged", "CredentialAdded")
      transactionHash: event.transactionHash,
      logIndex: event.logIndex,
      blockNumber: event.blockNumber,
      blockHash: event.blockHash,
      ...event.args // Argumentos del evento
    });
  }

  console.log("Todos los eventos inicializados desde la blockchain.");
  await updateLastProcessedBlock(currentBlock);
}

// Verificar nuevos logs periódicamente y almacenar eventos recientes
async function checkForNewLogs() {
  const lastProcessedBlock = await getLastProcessedBlock();
  const currentBlock = await provider.getBlockNumber();
  if (currentBlock > lastProcessedBlock) {
    const filter = {};  // Filtro vacío para capturar todos los eventos
    const events = await contract.queryFilter(filter, lastProcessedBlock + 1, currentBlock);

    for (const event of events) {
      await saveEventLog({
        eventType: event.event,  // Tipo de evento (por ejemplo, "CredentialLogged", "CredentialAdded")
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        blockNumber: event.blockNumber,
        blockHash: event.blockHash,
        removed: event.removed,
        ...event.args // Argumentos del evento
      });
    }
    await updateLastProcessedBlock(currentBlock);
    console.log(`Processed new logs up to block ${currentBlock}`);
  }
}

// Suscribirse a todos los eventos en el contrato de forma genérica
function subscribeToEvents() {
  DePass_abi.forEach(item => {
    if (item.type === "event") {
      // Crear una suscripción dinámica basada en el nombre del evento
      contract.on(item.name, async (...args) => {
        const event = args[args.length - 1]; // El último argumento es el objeto `event`

        // Crear el objeto de datos del evento
        const eventData = {
          eventType: item.name,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
          blockNumber: event.blockNumber,
          blockHash: event.blockHash,
          removed: event.removed,
          args: args.slice(0, -1).map(arg => arg.toString()) // Convierte los argumentos a strings
        };

        // Guardar el evento en la base de datos
        await saveEventLog(eventData);
      });
      console.log(`Suscrito al evento: ${item.name}`);
    }
  });
  console.log("Suscrito a todos los eventos del contrato.");
}

// Endpoint para consultar eventos con múltiples filtros de forma generalizada
app.get("/getEventsByType/:eventType", async (req, res) => {
  const { eventType } = req.params;
  const filters = { eventType };

  // Agregar todos los parámetros de consulta como filtros, excepto `eventType`
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      filters[key] = req.query[key];
      console.log(`Filtro ${key}: ${filters[key]}`);
    }
  });

  try {
    const events = await db.collection("events").find(filters).toArray();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar el servidor y procesos
app.listen(port, async () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
  await connectDB();
  await initializeLogs();
  //setInterval(checkForNewLogs, 60000); // Verificar nuevos logs cada 60 segundos
  subscribeToEvents(); // Suscribirse a eventos en tiempo real
});