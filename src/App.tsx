import { AnswerCard } from './components/AnswerCard';
import './App.css';

function App() {
  return (
    <main className="app">
      <AnswerCard questions={10} optionsPerQuestion={5} />
    </main>
  );
}

export default App;
