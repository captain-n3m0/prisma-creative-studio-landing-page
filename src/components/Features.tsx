import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import WordsPullUpMultiStyle from './WordsPullUpMultiStyle';

interface FeatureCardProps {
  title: string;
  number: string;
  iconSrc: string;
  items: string[];
  index: number;
  isInView: boolean;
}

function FeatureCard({ title, number, iconSrc, items, index, isInView }: FeatureCardProps) {
  return (
    <motion.div
      className="flex h-full min-h-[260px] flex-col justify-between rounded-2xl border border-white/10 bg-black/40 p-4 shadow-2xl shadow-black/20 backdrop-blur-[1px] sm:min-h-[320px] sm:p-6 lg:min-h-0"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div>
        <div className="mb-5 sm:mb-6">
          <img
            src={iconSrc}
            alt={title}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover"
          />
        </div>

        <div className="mb-4 sm:mb-5">
          <span className="text-gray-500 text-[10px] sm:text-xs font-medium tracking-widest uppercase">{number}</span>
          <h3 className="text-primary text-base sm:text-lg font-medium mt-1 leading-snug break-words">{title}</h3>
        </div>

        <div className="w-full h-px bg-white/5 mb-4 sm:mb-5" />

        <ul className="flex flex-col gap-2.5 sm:gap-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <Check size={14} className="text-primary mt-0.5 flex-shrink-0" />
              <span className="text-gray-400 text-xs sm:text-sm leading-snug break-words">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 sm:mt-8 pt-4 border-t border-white/5">
        <a
          href="#"
          className="inline-flex items-center gap-1.5 text-primary/70 hover:text-primary text-xs sm:text-sm transition-colors duration-200 group"
        >
          <span>Learn more</span>
          <ArrowRight
            size={14}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
            style={{ transform: 'rotate(-45deg)' }}
          />
        </a>
      </div>
    </motion.div>
  );
}

interface SequenceCardProps {
  index: number;
  isInView: boolean;
}

function SequenceCard({ index, isInView }: SequenceCardProps) {
  return (
    <motion.div
      className="relative h-full min-h-[260px] overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-2xl shadow-black/20 backdrop-blur-[1px] sm:min-h-[320px] lg:min-h-0"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
      <div className="absolute left-4 top-4 rounded-full border border-primary/20 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-widest text-primary/75 sm:left-6 sm:top-6">
        Motion study
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
        <p className="font-medium text-base sm:text-lg" style={{ color: '#E1E0CC' }}>
          Your creative canvas.
        </p>
      </div>
    </motion.div>
  );
}

const FEATURE_CARDS = [
  {
    title: 'Project Storyboard.',
    number: '01',
    iconSrc:
      'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171918_4a5edc79-d78f-4637-ac8b-53c43c220606.png&w=1280&q=85',
    items: [
      'Drag-and-drop timeline with scene blocks',
      'Export to PDF or shareable link',
      'Attach reference images and mood boards',
      'Real-time collaboration with your crew',
    ],
  },
  {
    title: 'Smart Critiques.',
    number: '02',
    iconSrc:
      'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171741_ed9845ab-f5b2-4018-8ce7-07cc01823522.png&w=1280&q=85',
    items: [
      'AI-powered composition and color analysis',
      'Timestamped creative notes and annotations',
      'Seamless integrations with editing tools',
    ],
  },
  {
    title: 'Immersion Capsule.',
    number: '03',
    iconSrc:
      'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171809_f56666dc-c099-4778-ad82-9ad4f209567b.png&w=1280&q=85',
    items: [
      'Notification silencing during deep work sessions',
      'Curated ambient soundscapes for focus',
      'Calendar sync for scheduled creative blocks',
    ],
  },
];

export default function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="relative min-h-[100svh] px-3 py-12 sm:px-4 sm:py-20 md:px-6 md:py-28">
      <div className="bg-noise absolute inset-0 opacity-[0.15] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-8 max-w-4xl mx-auto sm:mb-12 md:mb-16">
          <WordsPullUpMultiStyle
            segments={[
              {
                text: 'Studio-grade workflows for visionary creators.',
                className: 'text-primary',
              },
            ]}
            className="text-lg min-[360px]:text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal mb-2 sm:mb-3 block"
            delay={0}
            stagger={0.05}
          />
          <WordsPullUpMultiStyle
            segments={[
              {
                text: 'Built for pure vision. Powered by art.',
                className: 'text-gray-500',
              },
            ]}
            className="text-lg min-[360px]:text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal block"
            delay={0.2}
            stagger={0.05}
          />
        </div>

        <div
          ref={ref}
          className="grid grid-cols-1 gap-3 sm:gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-1 lg:h-[480px]"
        >
          <SequenceCard index={0} isInView={isInView} />

          {FEATURE_CARDS.map((card, i) => (
            <FeatureCard
              key={card.number}
              {...card}
              index={i + 1}
              isInView={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
