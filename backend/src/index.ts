import app from "./app";

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`🚀 API server running at http://localhost:${port}`);
});
