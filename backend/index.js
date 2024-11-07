const express = require("express");
const { MongoClient } = require("mongodb");
const { ethers } = require("ethers");
require("dotenv").config();
const DePass_abi = require('../mwallet/src/contracts/DePassPassword_abi.json');

const app = express();
const cors = require("cors");
const port = 3001;

app.use(cors());

const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const contractAddress = process.env.CONTRACT_ADDRESS;
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
  await db.collection("events").insertOne({
    ...eventData,
    timestamp: new Date()  // Marca de tiempo de almacenamiento
  });
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
  const events = await contract.queryFilter(filter, lastProcessedBlock + 1, currentBlock);

  for (const event of events) {
    await saveEventLog({
      eventType: event.event,  // Tipo de evento (por ejemplo, "CredentialLogged", "CredentialAdded")
      ...event.args,           // Todos los argumentos del evento
      blockNumber: event.blockNumber
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
        ...event.args,           // Todos los argumentos del evento
        blockNumber: event.blockNumber
      });
    }
    await updateLastProcessedBlock(currentBlock);
    console.log(`Processed new logs up to block ${currentBlock}`);
  }
}

// Endpoint para consultar eventos con múltiples filtros de forma generalizada
app.get("/getEventsByType/:eventType", async (req, res) => {
  const { eventType } = req.params;
  const filters = { eventType };

  // Agregar todos los parámetros de consulta como filtros, excepto `eventType`
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      filters[key] = isNaN(req.query[key]) ? req.query[key] : parseInt(req.query[key], 10); 
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
  setInterval(checkForNewLogs, 60000); // Verificar nuevos logs cada 60 segundos
});