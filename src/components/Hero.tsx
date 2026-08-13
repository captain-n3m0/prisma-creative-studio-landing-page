import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import WordsPullUp from './WordsPullUp';

const NAV_ITEMS = ['Our story', 'Collective', 'Workshops', 'Programs', 'Inquiries'];

const customEase = [0.16, 1, 0.3, 1] as const;

export default function Hero() {
  return (
    <section className="h-[100svh] min-h-[560px] p-2.5 sm:min-h-[620px] sm:p-4 md:min-h-[680px] md:p-6">
      <div className="relative w-full h-full rounded-2xl md:rounded-[2rem] overflow-hidden">
        <div className="noise-overlay opacity-[0.7] mix-blend-overlay pointer-events-none z-10" />

        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 z-10 pointer-events-none" />

        <div className="absolute left-2 right-2 top-0 z-20 flex justify-center sm:left-4 sm:right-4">
          <nav className="scrollbar-none max-w-full overflow-x-auto overscroll-x-contain bg-black rounded-b-2xl px-3 py-2 sm:px-5 md:rounded-b-3xl md:px-8 md:py-3">
            <ul className="flex min-w-max items-center gap-3 sm:gap-5 md:gap-12 lg:gap-14">
              {NAV_ITEMS.map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-[9px] sm:text-xs md:text-sm whitespace-nowrap transition-colors duration-200"
                    style={{ color: 'rgba(225, 224, 204, 0.8)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#E1E0CC')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(225, 224, 204, 0.8)')}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col gap-5 px-3 pb-3 sm:gap-6 sm:px-4 sm:pb-4 md:grid md:grid-cols-12 md:items-end md:gap-0 md:px-6 md:pb-6">
          <div className="relative order-2 md:order-none md:col-span-8">
            <h1
              className="font-medium leading-[0.85] tracking-normal text-[4.8rem] min-[360px]:text-[5.8rem] sm:text-[7.5rem] md:text-[9rem] lg:text-[12rem] xl:text-[17rem] 2xl:text-[18rem]"
              style={{ color: '#E1E0CC' }}
            >
              <WordsPullUp
                text="Prisma"
                showAsterisk={true}
                delay={0}
                stagger={0.08}
              />
            </h1>
          </div>

          <div className="order-1 flex w-[72vw] max-w-[17rem] flex-col items-end gap-3 self-end text-right sm:max-w-[20rem] md:order-none md:col-span-4 md:w-auto md:max-w-none md:items-start md:gap-6 md:self-auto md:pb-2 md:pl-4 md:text-left">
            <motion.p
              className="text-primary/75 text-[10px] min-[360px]:text-[11px] sm:text-sm md:text-base"
              style={{ lineHeight: 1.2 }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5, ease: customEase }}
            >
              Prisma is a worldwide network of visual artists, filmmakers and storytellers bound not by place, status or labels but by passion and hunger to unlock potential through our unique perspectives.
            </motion.p>

            <motion.button
              className="group flex items-center gap-2 bg-primary rounded-full pl-3 pr-1 py-1 transition-all duration-300 hover:gap-3 sm:pl-5"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7, ease: customEase }}
            >
              <span className="whitespace-nowrap font-medium text-xs text-black sm:text-base">Join the lab</span>
              <span className="bg-black rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <ArrowRight size={15} className="text-[#DEDBC8]" />
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
