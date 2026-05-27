import { useState } from 'react';
import './AnswerCard.css';

interface AnswerCardProps {
  questions?: number;
  optionsPerQuestion?: number;
}

export function AnswerCard({ questions = 10, optionsPerQuestion = 5 }: AnswerCardProps) {
  const [answers, setAnswers] = useState<Record<number, string | null>>({});

  const handleSelect = (questionIndex: number, option: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: prev[questionIndex] === option ? null : option
    }));
  };

  const letters = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="answer-card">
      <div className="card-header">
        <h2>Cartao Resposta</h2>
        <p>Preencha o quadrado correspondente a cada questao</p>
      </div>

      <div className="answer-grid">
        <div className="grid-header">
          <div className="question-col-header">Questao</div>
          {letters.slice(0, optionsPerQuestion).map(letter => (
            <div key={letter} className="option-col-header">{letter}</div>
          ))}
        </div>

        {Array.from({ length: questions }, (_, i) => (
          <div key={i} className="answer-row">
            <div className="question-number">{i + 1}</div>
            {letters.slice(0, optionsPerQuestion).map(letter => {
              const isSelected = answers[i] === letter;
              return (
                <button
                  key={letter}
                  type="button"
                  className={`answer-square ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(i, letter)}
                  aria-label={`Questao ${i + 1} - Opcao ${letter}`}
                >
                  <span className="square-marker">{isSelected && '■'}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="card-footer">
        <p>Total de questoes: {questions}</p>
        <p>Respostas preenchidas: {Object.values(answers).filter(Boolean).length}</p>
      </div>
    </div>
  );
}
