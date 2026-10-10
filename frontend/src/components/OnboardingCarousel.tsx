import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Map, Wind, ArrowRight, Check } from 'lucide-react';
import onboarding1 from '../assets/images/onboarding1.png';
import onboarding2 from '../assets/images/onboarding2.png';
import onboarding3 from '../assets/images/onboarding3.png';

const slides = [
  {
    id: 1,
    title: "Pollution-Aware Routing",
    description: "Navigate through the city's cleanest corridors. We mathematically interpolate real-time PM2.5 sensors.",
    image: onboarding1,
    icon: <Map size={24} />
  },
  {
    id: 2,
    title: "Protect Your Health",
    description: "Reduce respiratory exposure by up to 30% on every shift. Your lungs are your most valuable asset.",
    image: onboarding2,
    icon: <Shield size={24} />
  },
  {
    id: 3,
    title: "Built for Riders",
    description: "Sunlight-optimized high-contrast HUD and real-time audio guidance keeps your eyes on the road.",
    image: onboarding3,
    icon: <Wind size={24} />
  }
];

interface Props {
  onComplete: () => void;
}

export const OnboardingCarousel: React.FC<Props> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      localStorage.setItem('hasSeenOnboarding', 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    onComplete();
  };

  return (
    <div className="onboarding-wrapper">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <button onClick={handleSkip} className="btn-skip">Skip</button>
        </div>
        
        <div className="carousel-viewport">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, { offset, velocity }) => {
                const swipe = swipePower(offset.x, velocity.x);
                if (swipe < -10000) {
                  handleNext();
                } else if (swipe > 10000 && currentIndex > 0) {
                  setCurrentIndex(currentIndex - 1);
                }
              }}
              className="carousel-slide"
            >
              <div className="slide-image-container">
                <img src={slides[currentIndex].image} alt={slides[currentIndex].title} className="slide-image" />
              </div>
              <div className="slide-content">
                <div className="slide-icon-wrapper">{slides[currentIndex].icon}</div>
                <h2 className="slide-title">{slides[currentIndex].title}</h2>
                <p className="slide-desc">{slides[currentIndex].description}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="onboarding-footer">
          <div className="dots-container">
            {slides.map((_, idx) => (
              <div 
                key={idx} 
                className={`nav-dot ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(idx)}
              />
            ))}
          </div>
          
          <button className="btn-next" onClick={handleNext}>
            {currentIndex === slides.length - 1 ? (
              <>Get Started <Check size={18} /></>
            ) : (
              <>Next <ArrowRight size={18} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};
