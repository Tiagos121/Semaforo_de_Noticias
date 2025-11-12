import "./App.css";
import TesteNoticias from "./components/TesteNoticias";
import TesteMeteo from "./components/TesteMeteo";
import FeedNoticias from "./components/FeedNoticias";
import PoliticaNoticias from "./components/NoticiasPotica";

function App() {
  return (
    <div className="container">
      <header>
        <h1>🌍 Semáforo de Noticias — Painel de Teste de APIs</h1>
        <p>Verifica o funcionamento das APIs: Notícias, Meteorologia e Análise de Viés</p>
      </header>

      <main>
        <TesteMeteo />
      </main>

      <footer>
        <p>Desenvolvido com ❤️ por [Tiago]</p>
      </footer>
    </div>
  );
}

export default App;
