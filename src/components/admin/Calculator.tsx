"use client";

import { useState } from "react";

function evaluateExpression(expression: string) {
  const tokens = expression.match(/(?:\d+\.?\d*|\.\d+|[()+\-*/])/g) || [];
  if (!tokens.length || tokens.join("") !== expression.replace(/\s/g, "")) throw new Error("Invalid expression");
  let position = 0;

  function factor(): number {
    const token = tokens[position];
    if (token === "+" || token === "-") {
      position += 1;
      const value = factor();
      return token === "-" ? -value : value;
    }
    if (token === "(") {
      position += 1;
      const value = expressionValue();
      if (tokens[position] !== ")") throw new Error("Missing closing parenthesis");
      position += 1;
      return value;
    }
    if (token && /^(?:\d+\.?\d*|\.\d+)$/.test(token)) {
      position += 1;
      return Number(token);
    }
    throw new Error("Invalid expression");
  }

  function term(): number {
    let value = factor();
    while (tokens[position] === "*" || tokens[position] === "/") {
      const operator = tokens[position++];
      const next = factor();
      value = operator === "*" ? value * next : value / next;
    }
    return value;
  }

  function expressionValue(): number {
    let value = term();
    while (tokens[position] === "+" || tokens[position] === "-") {
      const operator = tokens[position++];
      const next = term();
      value = operator === "+" ? value + next : value - next;
    }
    return value;
  }

  const result = expressionValue();
  if (position !== tokens.length || !Number.isFinite(result)) throw new Error("Invalid expression");
  return result;
}

export function Calculator({ onClose }: { onClose: () => void }) {
  const [expression, setExpression] = useState("");
  const press = (key: string) => {
    if (key === "C") { setExpression(""); return; }
    if (key === "=") {
      setExpression((current) => {
        try { return String(evaluateExpression(current)); } catch { return "Error"; }
      });
      return;
    }
    setExpression((current) => `${current === "Error" ? "" : current}${key}`);
  };

  return <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="admin-calculator-title" style={{ maxWidth: 340 }}>
      <div className="modal-head"><h3 id="admin-calculator-title">Calculator</h3><button className="x-btn" type="button" aria-label="Close calculator" onClick={onClose}>×</button></div>
      <div className="modal-body">
        <output aria-label="Calculator display" style={{ display: "block", background: "var(--sidebar-bg)", color: "#fff", fontSize: 24, textAlign: "right", padding: 14, borderRadius: 8, marginBottom: 10, overflowX: "auto", minHeight: 56 }}>{expression || "0"}</output>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
          {["C", "(", ")", "/", "7", "8", "9", "*", "4", "5", "6", "-", "1", "2", "3", "+", "0", ".", "="].map((key) => <button className={`btn${key === "=" ? " btn-primary" : ""}`} style={{ justifyContent: "center", padding: "12px 0" }} type="button" key={key} aria-label={key === "*" ? "Multiply" : key === "/" ? "Divide" : key === "=" ? "Calculate" : key === "C" ? "Clear" : key} onClick={() => press(key)}>{key === "*" ? "×" : key === "/" ? "÷" : key}</button>)}
        </div>
      </div>
    </div>
  </div>;
}