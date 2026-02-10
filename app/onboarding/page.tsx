"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onboardingSource } from "@/helpers/onboardingSource";
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { ThirdwebConnectButton } from "@/components/auth/ThirdwebConnectButton";
import { useAuthSession } from "@/context/AuthSessionContext";
import AuthHandoff from "@/components/auth/AuthHandoff";
import DotPayLogo from "@/components/brand/DotPayLogo";

const Onboarding = () => {
  const { isLoggedIn, hasChecked } = useAuthSession();
  const router = useRouter();
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (hasChecked && isLoggedIn) {
      router.replace("/auth/finish?mode=signup");
    }
  }, [hasChecked, isLoggedIn, router]);

  useEffect(() => {
    if (!carouselApi) return;

    const onSelect = () => {
      setActiveSlide(carouselApi.selectedScrollSnap());
    };

    onSelect();
    carouselApi.on("select", onSelect);
    carouselApi.on("reInit", onSelect);

    return () => {
      carouselApi.off("select", onSelect);
      carouselApi.off("reInit", onSelect);
    };
  }, [carouselApi]);

  if (hasChecked && isLoggedIn) {
    return (
      <AuthHandoff
        variant="onboarding"
        title="Welcome back"
        subtitle="Opening your wallet..."
      />
    );
  }

  return (
    <main className="onboarding-bg">
      <div className="flex justify-around w-full">
        <DotPayLogo className="py-10 md:py-16" size={72} />
      </div>
      <div className="xsm:flex justify-center">
        <Carousel className="xsm:w-[400px]" setApi={setCarouselApi}>
          <CarouselContent>
            {onboardingSource.map((element, index) => {
              return (
                <CarouselItem key={index}>
                  <div className="flex flex-col justify-around h-[280px]">
                    <h2 className="text-4xl text-white font-bold">
                      {element.title}
                    </h2>
                    <h4 className="text-white my-5">{element.subtitle}</h4>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      </div>
      <div className="mt-2 mb-5 flex justify-center gap-2">
        {onboardingSource.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => carouselApi?.scrollTo(index)}
            className={`h-2 rounded-full transition-all ${
              index === activeSlide ? "w-10 bg-white" : "w-5 bg-white/40"
            }`}
            aria-label={`Go to onboarding slide ${index + 1}`}
            aria-current={index === activeSlide}
          />
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-[320px] flex-col items-center gap-3 pb-8">
        <div className="w-full">
          <ThirdwebConnectButton mode="signup" />
        </div>
        <p className="text-white/80 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-white underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
};

export default Onboarding;
