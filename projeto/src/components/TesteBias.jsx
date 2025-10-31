import { useState } from "react";
import "../../src/index.css";

export default function TesteBias() {
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const HF_API_KEY = import.meta.env.VITE_HF_API_KEY;

  const analisarViés = async () => {
    setResultado("A analisar...");
    setErro(null);

    if (!HF_API_KEY) {
      setErro("API key da Hugging Face não definida");
      return;
    }

    if (!texto.trim()) {
      setErro("Por favor, escreve um texto para analisar");
      return;
    }

    try {
      const res = await fetch(
        "https://api-inference.huggingface.co/models/joeddav/xlm-roberta-large-xnli",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: texto,
            parameters: { candidate_labels: ["esquerda", "centro", "direita"] },
          }),
        }
      );

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Erro na API: ${res.status} → ${msg}`);
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.labels) throw new Error("Resposta inválida da API");

      const maior = data.labels[0];
      const score = (data.scores[0] * 100).toFixed(1);
      setResultado(`${maior.toUpperCase()} (${score}%)`);
    } catch (err) {
      console.error(err);
      setErro(err.message);
      setResultado(null);
    }
  };

  return (
    <div className="card">
      <h2>🧠 Análise de Viés</h2>
      <textarea
        rows="3"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escreve o título ou resumo da notícia..."
      />
      <button onClick={analisarViés}>Analisar</button>
      {resultado && <p>Resultado: {resultado}</p>}
      {erro && <p style={{ color: "red" }}>Erro: {erro}</p>}
    </div>
  );
}