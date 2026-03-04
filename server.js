const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();
const { testDatabaseConnection } = require("./config/db");
const scanRoutes = require("./routes/scanRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/vendor", express.static(path.join(__dirname, "node_modules", "three", "build")));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.status(200).json({ ok: true, service: "DocSim" });
});

app.use("/api/scan", scanRoutes);
app.use(errorMiddleware);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function startServer() {
  await testDatabaseConnection();

  app.listen(PORT, () => {
    if (PORT === 3000) {
      console.log("Server running on port 3000");
      return;
    }

    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
