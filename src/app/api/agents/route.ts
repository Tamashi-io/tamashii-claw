import { NextResponse } from "next/server";

const HYPERCLI_API = () => process.env.HYPERCLI_API_URL || "https://api.hypercli.com";
const API_KEY = () => process.env.HYPERCLI_CLAW_API_KEY || "";

export async function GET() {
  try {
    const res = await fetch(`${HYPERCLI_API()}/jobs`, {
      headers: { Authorization: `Bearer ${API_KEY()}` },
    });

    if (!res.ok) {
      throw new Error(`HyperCLI API ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const jobs = Array.isArray(data) ? data : data.jobs || [];

    const agents = jobs.map((job: Record<string, unknown>) => ({
      id: job.job_id,
      name:
        typeof job.docker_image === "string"
          ? job.docker_image.split("/").pop()?.split(":")[0]
          : job.job_id,
      state: job.state,
      hostname: job.hostname,
      description: `${job.gpu_type} x${job.gpu_count} — ${job.region}`,
      cpu: 0,
      memory: 0,
    }));

    return NextResponse.json({ agents });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch agents";
    console.error("[/api/agents]", message);
    return NextResponse.json({ agents: [], error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const res = await fetch(`${HYPERCLI_API()}/jobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gpu_type: body.gpuType || "L40S",
        gpu_count: body.gpuCount || 1,
        docker_image: body.image || "nvidia/cuda:12.0-runtime-ubuntu22.04",
        command: body.command
          ? Buffer.from(body.command).toString("base64")
          : undefined,
        runtime: body.runtime || 3600,
        env_vars: body.env,
      }),
    });

    if (!res.ok) {
      throw new Error(`HyperCLI API ${res.status}: ${await res.text()}`);
    }

    return NextResponse.json(await res.json(), { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create agent";
    console.error("[/api/agents POST]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
