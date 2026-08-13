import Hero from './components/Hero';
import About from './components/About';
import Features from './components/Features';
import ScrollFrameSequence from './components/ScrollFrameSequence';

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black">
      <ScrollFrameSequence />
      <main className="relative z-10 min-h-screen">
        <Hero />
        <About />
        <Features />
      </main>
    </div>
  );
}
