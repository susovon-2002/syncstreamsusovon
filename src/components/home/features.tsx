'use client';

import { BookOpen, Globe, HeartHandshake, Megaphone, PartyPopper } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";

const features = [
  {
    icon: <HeartHandshake className="w-10 h-10 text-[#ff9933]" />,
    title: "Families Staying Connected",
    description: "Share precious moments and watch your favorite home videos or movies together, no matter the distance.",
  },
  {
    icon: <PartyPopper className="w-10 h-10 text-white" />,
    title: "Friends Watching Content",
    description: "Your weekly movie night just got an upgrade. Laugh, cry, and react in real-time with your best friends.",
  },
  {
    icon: <BookOpen className="w-10 h-10 text-[#22c55e]" />,
    title: "Students Learning Collaboratively",
    description: "Study groups can watch lectures, tutorials, and educational videos together, making learning more interactive.",
  },
  {
    icon: <Megaphone className="w-10 h-10 text-[#ff9933]" />,
    title: "Online Creators Hosting Sessions",
    description: "Engage your audience like never before. Host live watch parties for your latest content and interact with fans.",
  },
  {
    icon: <Globe className="w-10 h-10 text-[#22c55e]" />,
    title: "Communities Gathering Virtually",
    description: "From local clubs to global fanbases, bring your community together for shared experiences and events.",
  },
];


export function Features() {
  return (
    <section className="container mx-auto py-20">
      <div className="text-center mb-12">
        <h2 className="tricolor-text text-4xl font-extrabold tracking-tight md:text-5xl font-headline">Built For Everyone</h2>
        <p className="max-w-3xl mx-auto mt-4 text-lg text-muted-foreground">
          We believe that technology should bring people closer. SyncStream is designed for all kinds of connections.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <Card key={index} className="glass-panel group flex flex-col items-center rounded-lg text-center transition duration-300 hover:-translate-y-2 hover:border-white/30 hover:shadow-[0_22px_70px_rgb(255_255_255_/_0.10)]">
            <CardHeader>
              <div className="mb-4 flex justify-center transition-transform duration-300 group-hover:scale-110">
                {feature.icon}
              </div>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription className="mt-2">{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
