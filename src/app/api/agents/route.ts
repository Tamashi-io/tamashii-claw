import { NextResponse } from "next/server";
import { getClient } from "@/lib/hypercli";

export async function GET() {
  try {
    const client = getClient();
    const jobs = await client.jobs.list();
    // Map HyperCLI jobs to TamashiiClaw agent format
    const agents = jobs.map((job) => ({
      id: job.jobId,
      name: job.dockerImage?.split("/").pop()?.split(":")[0] || job.jobId,
      state: job.state,
      hostname: job.hostname,
      description: `${job.gpuType} x${job.gpuCount} — ${job.region}`,
      cpu: 0,
      memory: 0,
    }));
    return NextResponse.json({ agents });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch agents";
    return NextResponse.json({ agents: [], error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const client = getClient();
    const body = await request.json();
    const job = await client.jobs.create({
      image: body.image || "nvidia/cuda:12.0-runtime-ubuntu22.04",
      gpuType: body.gpuType || "l40s",
      gpuCount: body.gpuCount || 1,
      runtime: body.runtime || 3600,
      command: body.command,
      env: body.env,
    });
    return NextResponse.json(job, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create agent";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
