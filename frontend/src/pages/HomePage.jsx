import React from 'react';
import { HeroSection } from '../components/home/HeroSection';
import { HowItWorksSection } from '../components/home/HowItWorksSection';
import { PipelineSection } from '../components/home/PipelineSection';
import { GISPreviewSection } from '../components/home/GISPreviewSection';
import { CommunitySection } from '../components/home/CommunitySection';
import { AlertHierarchy } from '../components/home/AlertHierarchy';

export function HomePage() {
  return (
    <div className="home-page" style={{ width: '100%' }}>
      <HeroSection />
      <HowItWorksSection />
      <PipelineSection />
      <GISPreviewSection />
      <CommunitySection />
      <AlertHierarchy />
    </div>
  );
}
