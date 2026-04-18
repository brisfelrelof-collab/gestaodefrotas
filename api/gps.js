let lastData = {};

export default function handler(req, res) {
  if (req.method === "POST") {
    const { lat, lon } = req.body;

    lastData = {
      lat,
      lon,
      time: new Date().toISOString()
    };

    return res.status(200).json({
      message: "Coordenadas recebidas",
      data: lastData
    });
  }

  if (req.method === "GET") {
    return res.status(200).json(lastData);
  }

  res.status(405).json({ message: "Método não permitido" });
}