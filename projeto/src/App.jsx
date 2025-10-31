import "./App.css";
import TesteNoticias from "./components/TesteNoticias";
import TesteMeteo from "./components/TesteMeteo";
import TesteBias from "./components/TesteBias";

function App() {
  return (
    <div className="container">
      <header>
        <h1>🌍 Semáforo de Noticias — Painel de Teste de APIs</h1>
        <p>Verifica o funcionamento das APIs: Notícias, Meteorologia e Análise de Viés</p>
      </header>

      <main>
        <TesteNoticias />
        <TesteMeteo />
        <TesteBias />
      </main>

      <footer>
        <p>Desenvolvido com ❤️ por [teu nome]</p>
      </footer>
    </div>
  );
}

export default App;
