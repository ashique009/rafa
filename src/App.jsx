import LiquidVisualizer from './components/LiquidVisualizer';

function App() {
  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#030308',
      }}
    >
      <LiquidVisualizer />
    </main>
  );
}

export default App;
