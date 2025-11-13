import "./App.css";
import PoliticaNoticias from "./components/NoticiasPotica";
import DisplayLocalizacao from "./components/tempo_local/DisplayLocalizacao";

function App() {
  return (
    <div className="container">
      <header>
        <h1>🌍 Semáforo de Noticias — Painel de Teste de APIs</h1>
        <p>Verifica o funcionamento das APIs: Notícias, Meteorologia e Análise de Viés</p>
      </header>

      <main>
        <DisplayLocalizacao />
      </main>

      <footer>
        <p>Desenvolvido com ❤️ por [Tiago]</p>
      </footer>
    </div>
  );
}

export default App;
