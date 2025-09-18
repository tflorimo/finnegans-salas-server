import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello, Finnegans backend is running!");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;