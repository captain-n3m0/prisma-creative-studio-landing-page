import { motion, useTransform, MotionValue } from 'framer-motion';

interface AnimatedLetterProps {
  char: string;
  index: number;
  total: number;
  scrollYProgress: MotionValue<number>;
}

export default function AnimatedLetter({
  char,
  index,
  total,
  scrollYProgress,
}: AnimatedLetterProps) {
  const charProgress = index / total;
  const rangeStart = Math.max(0, charProgress - 0.1);
  const rangeEnd = Math.min(1, charProgress + 0.05);

  const opacity = useTransform(
    scrollYProgress,
    [rangeStart, rangeEnd],
    [0.2, 1]
  );

  if (char === ' ') {
    return <span style={{ display: 'inline-block', width: '0.3em' }}>&nbsp;</span>;
  }

  return (
    <motion.span style={{ opacity, display: 'inline-block' }}>
      {char}
    </motion.span>
  );
}
