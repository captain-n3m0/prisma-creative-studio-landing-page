import { useRef } from 'react';
import { useScroll } from 'framer-motion';
import WordsPullUpMultiStyle from './WordsPullUpMultiStyle';
import AnimatedLetter from './AnimatedLetter';

const BODY_TEXT =
  'Over the last seven years, I have worked with Parallax, a Berlin-based production house that crafts cinema, series, and Noir Studio in Paris. Together, we have created work that has earned international acclaim at several major festivals.';

export default function About() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 0.8', 'end 0.2'],
  });

  const chars = BODY_TEXT.split('');

  return (
    <section ref={sectionRef} className="relative flex min-h-[100svh] items-center px-3 py-12 sm:px-4 sm:py-20 md:px-6 md:py-28">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-2xl md:rounded-3xl border border-white/10 bg-black/30 px-4 py-8 text-center shadow-2xl shadow-black/20 backdrop-blur-[1px] sm:px-10 sm:py-14 md:px-16 md:py-20">
          <p className="text-primary text-[10px] sm:text-xs tracking-widest uppercase mb-5 sm:mb-8 md:mb-10">
            Visual arts
          </p>

          <div className="text-2xl min-[360px]:text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl max-w-3xl mx-auto leading-tight sm:leading-[0.95] md:leading-[0.9] mb-7 sm:mb-10 md:mb-14"
               style={{ color: '#E1E0CC' }}>
            <WordsPullUpMultiStyle
              segments={[
                {
                  text: 'I am Marcus Chen,',
                  className: 'font-normal',
                },
                {
                  text: 'a self-taught director.',
                  className: 'font-serif-italic',
                },
                {
                  text: 'I have skills in color grading, visual effects, and narrative design.',
                  className: 'font-normal',
                },
              ]}
              delay={0}
              stagger={0.06}
            />
          </div>

          <div className="w-12 h-px bg-primary/20 mx-auto mb-8 sm:mb-10 md:mb-12" />

          <p
            className="text-xs sm:text-sm md:text-base max-w-2xl mx-auto break-words"
            style={{ color: '#DEDBC8', lineHeight: 1.7 }}
          >
            {chars.map((char, i) => (
              <AnimatedLetter
                key={i}
                char={char}
                index={i}
                total={chars.length}
                scrollYProgress={scrollYProgress}
              />
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
