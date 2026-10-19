"use client";
import { useEffect } from "react";
import { progress } from "@/lib/progress";
export function TrackPhysics() {
  useEffect(() => progress.visit("physics", "physics", "MRI Physics Learning Centre", "/physics/"), []);
  return null;
}
