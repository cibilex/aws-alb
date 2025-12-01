const express = require("express");
const metadataUri =
  process.env.ECS_CONTAINER_METADATA_URI_V4 ||
  process.env.ECS_CONTAINER_METADATA_URI;
const PORT = process.env.PORT || 3000;

const app = express();

const getECSTaskId = async () => {
  try {
    if (!metadataUri) return null;

    const res = await fetch(`${metadataUri}/task`);
    if (!res.ok) return null;

    const data = await res.json();
    const taskArn = data?.TaskARN;
    if (!taskArn) return null;

    const taskId = taskArn.split("/").pop(); // ARN’den sadece task-id kısmını alıyoruz
    return taskId;
  } catch (error) {
    console.error("Error getting ECS task ID:", error);
    return null;
  }
};

app.get("/", async (_req, res) => {
  const taskId = await getECSTaskId();
  if (!taskId) return res.status(500).send("Error getting ECS task ID");
  res.send(`ECS task ID: ${taskId}`);
});

app.get("/hi", async (_req, res) => {
  res.send("hi world :)");
});

app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
