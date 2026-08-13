import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface Segment {
  text: string;
  className?: string;
}

interface WordsPullUpMultiStyleProps {
  segments: Segment[];
  className?: string;
  delay?: number;
  stagger?: number;
}

export default function WordsPullUpMultiStyle({
  segments,
  className = '',
  delay = 0,
  stagger = 0.08,
}: WordsPullUpMultiStyleProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-5% 0px' });

  // Build a flat list of {word, className} pairs
  const wordItems: { word: string; className: string }[] = [];
  for (const segment of segments) {
    const words = segment.text.trim().split(/\s+/);
    for (const word of words) {
      wordItems.push({ word, className: segment.className || '' });
    }
  }

  return (
    <span
      ref={ref}
      className={`inline-flex flex-wrap justify-center ${className}`}
    >
      {wordItems.map((item, i) => (
        <span
          key={i}
          className="overflow-hidden inline-flex items-baseline"
          style={{ marginRight: i < wordItems.length - 1 ? '0.22em' : 0, marginBottom: '0.05em' }}
        >
          <motion.span
            className={`inline-block ${item.className}`}
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
            transition={{
              duration: 0.7,
              delay: delay + i * stagger,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {item.word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
