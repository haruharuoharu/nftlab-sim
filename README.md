# NFTLab Sim
![NFTLab Sim logo](assets/logo.png)

A hands-on sandbox simulating real NFT use-cases, unlocked through quiz progress.

## Overview

NFTLab Sim combines quiz-based learning with an interactive sandbox where users don't just answer questions about real NFT pilots—they actually mint, transfer, and redeem demo NFTs replicating those scenarios (e.g., ticket resale, loyalty points, membership access). This experiential approach helps investors and professionals truly grasp NFT mechanics before applying them to real assets.

## Problem

Reading or quizzing alone doesn't build real confidence in actually using NFTs. People fear making mistakes with real assets, so knowledge never turns into practical skill.

## Solution

NFTLab Sim lets users practice real NFT workflows risk-free in a simulated sandbox, unlocked progressively as they demonstrate quiz mastery. Every action — minting, transferring, redeeming — mirrors a real-world pilot use-case.

## Features (MVP)

- Quiz gates unlocking sandbox scenarios step by step
- Mint/transfer/redeem demo NFTs mimicking real pilot use-cases
- Scenario library: ticket resale, loyalty points, membership access
- Progress tracker showing completed real-world scenario simulations
- Shareable completion certificate NFT after finishing all scenarios

## Tech Stack

- Anchor
- Metaplex
- Next.js
- Solana Devnet
- Wallet Adapter
- PostgreSQL

## How It Works

```
[User] --quiz--> [Quiz Engine] --unlock--> [Sandbox Scenario]
                                              |
                                      mint / transfer / redeem
                                              |
                                     [Anchor Program + Metaplex]
                                              |
                                      [Solana Devnet]
                                              |
                                  [Progress Tracker (PostgreSQL)]
                                              |
                              [Certificate NFT on completion]
```

Users progress through quizzes tied to real NFT pilot scenarios. Passing a quiz unlocks the matching sandbox scenario, where a Next.js frontend with Wallet Adapter lets them mint, transfer, or redeem demo NFTs through an Anchor program using Metaplex standards, all on Solana Devnet. Progress is stored in PostgreSQL, and completing every scenario mints a shareable certificate NFT.

## Roadmap

- Add more real-world scenario modules based on new pilots
- Introduce social/competitive sandbox challenges
- Explore partnerships to turn simulated scenarios into real pilot onboarding

## Pitch

- [Pitch deck (PDF)](docs/pitch.pdf)
- [Pitch script](docs/pitch-script.md)

## Team

- Name — Role — [GitHub](#) / [Twitter](#)
- Name — Role — [GitHub](#) / [Twitter](#)
- Name — Role — [GitHub](#) / [Twitter](#)

Built for the Colosseum hackathon.

---

🎬 Pitch video: [docs/pitch-video.mp4](docs/pitch-video.mp4)

## v0.1 implementation

The repository now includes a Japanese Next.js learning app with three quiz-gated scenarios, browser simulation, Solana Devnet Metaplex Core mint/transfer/burn operations, and shareable completion certificates. Progress uses browser storage with optional PostgreSQL synchronization.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. No wallet or database is required for simulation mode.

See [development and verification guide](docs/development.md) for Devnet wallet setup, PostgreSQL schema, optional Anchor learning receipts, validation commands, and current limitations. Existing pitch materials describe the original concept; the guide describes the implementation.

**Status:** application tests, typecheck and production build are locally verified. Devnet transactions, PostgreSQL integration, and Anchor compilation/deployment require environment validation. Certificates and Anchor receipts are self-reported educational records, not accredited or independently verified credentials. The custom Anchor program is optional and not deployed; Metaplex Core NFT actions directly use the existing Core program.

