"use client";

import React, { Dispatch, SetStateAction } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import dynamic from "next/dynamic";
import errorJson from "@/public/json/error.json";

// Dynamically import Player to avoid SSR issues
const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player),
  { ssr: false }
);

const ErrorDialog = ({
  openError,
  setOpenError,
  message,
}: {
  openError: boolean;
  setOpenError: Dispatch<SetStateAction<boolean>>;
  message: string;
}) => {
  return (
    <Dialog open={openError} onOpenChange={setOpenError}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="mb-[5px]">{message}</DialogTitle>
          <Player
            keepLastFrame
            autoplay
            loop={true}
            src={errorJson}
            style={{ height: "200px", width: "200px" }}
          ></Player>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default ErrorDialog;
