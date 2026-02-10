"use client";

import React, { Dispatch, SetStateAction } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import dynamic from "next/dynamic";
import LoadingJson from "@/public/json/loading.json";

// Dynamically import Player to avoid SSR issues
const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player),
  { ssr: false }
);

const LoadingDialog = ({
  openLoading,
  setOpenLoading,
  message,
}: {
  openLoading: boolean;
  setOpenLoading: Dispatch<SetStateAction<boolean>>;
  message: string;
}) => {
  return (
    <Dialog open={openLoading} onOpenChange={setOpenLoading}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="mb-[5px]">{message}</DialogTitle>
          <Player
            keepLastFrame
            autoplay
            loop={true}
            src={LoadingJson}
            style={{ height: "200px", width: "200px" }}
          ></Player>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default LoadingDialog;
