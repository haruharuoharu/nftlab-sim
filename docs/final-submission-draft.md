# Final submission draft

## One-line description

NFTLab Sim is a bilingual, hands-on sandbox where fans and event teams learn digital ticketing, visit rewards, and member access by actually minting, transferring, and redeeming NFTs—first without a wallet, then on Solana Devnet.

## Project description

Reading about NFTs does not prepare people to use them under real event conditions. Fans worry about losing assets or making irreversible mistakes, while venue and support teams need a repeatable way to explain ownership, transfer, and redemption before a pilot goes live.

NFTLab Sim turns that onboarding gap into an interactive practice journey. Short quizzes unlock three reusable scenarios: ticket transfer and entry, a one-time visit reward, and member-only access. Each scenario follows the same concrete flow—mint, transfer, redeem—so users learn what changes on-chain and why used assets must not be reused.

The app starts in a wallet-free browser simulation. Users who are ready can repeat the experience with real Metaplex Core assets on Solana Devnet. Progress is preserved, and completing all three scenarios unlocks a shareable learning certificate. The interface is available in Japanese and English.

## Who it is for

- Fans encountering wallet-based event experiences for the first time
- Venue staff and customer-support teams preparing for a digital-asset pilot
- Event organizers and implementation partners validating ticket, loyalty, or membership journeys before launch

## EntertainmentTech fit

The implementation is venue-agnostic and can be adapted to stadiums, arenas, live venues, sports events, attractions, and fan communities. For a Tokyo Dome City use case, the same modules could be configured around an event ticket and entry flow, a one-time on-site benefit, and access to a members-only experience. The current submission is an independent hackathon prototype, not an official Tokyo Dome service or partnership.

## Why Solana

Solana makes the full ownership journey visible and testable at low cost. NFTLab Sim uses Metaplex Core on Devnet for mint, transfer, and burn-based redemption. The optional Anchor learning receipt records completion for the connected wallet. Simulation mode keeps the first experience approachable, while Devnet proves that the same learning flow can execute on-chain.

## What is working now

- Japanese/English responsive web app
- Quiz-gated ticket, loyalty, and membership scenarios
- Wallet-free browser simulation
- Solana Devnet mint, transfer, and redemption with Metaplex Core
- Progress persistence with optional PostgreSQL sync
- Completion certificate and optional Anchor learning receipt
- Public demo and open-source repository

## Business model

NFTLab Sim begins as a B2B pilot and onboarding product for venues, organizers, and implementation partners.

1. Paid pilot: customize scenario copy, learning content, and visual identity for one event or facility.
2. Enablement: provide staff training and help design support flows using the same fan-facing scenarios.
3. Recurring license: offer an expanding scenario library for repeated campaigns, venues, and partner programs.

This service-led entry point fits the founder's customer-support and customer-success background: identify where users become confused, turn those moments into guided practice, and feed what is learned back into product design.

## Differentiation

Most NFT education stops at explanations or quizzes. NFTLab Sim combines knowledge checks with the complete action sequence, offers a no-wallet starting point, and lets the same user graduate to real Devnet transactions. It is both a fan onboarding experience and a reusable rehearsal tool for the team operating the pilot.

## Current scope and next steps

The MVP is educational and runs on simulation mode and Solana Devnet; it is not connected to production ticketing, point-of-sale, identity, or venue access systems. The next pilot milestone is to customize one scenario pack with an entertainment partner, test it with fans and frontline staff, and measure completion, support questions, and confidence before and after the experience.

## Links

- Demo: https://nftlab-sim.haruharuoharu.workers.dev
- Source: https://github.com/haruharuoharu/nftlab-sim
- Colosseum project: https://colosseum.com/arena/projects/nftlab-sim

## Short pitch

NFT utility fails when people are expected to learn with real assets. NFTLab Sim gives fans and event teams a safe place to rehearse the complete journey first. Users pass a short quiz, then mint, transfer, and redeem a ticket, reward, or member pass—without a wallet in simulation mode or with real Metaplex Core NFTs on Solana Devnet. The same venue-agnostic modules can support live events, sports, attractions, and fan communities, while operators reuse them for staff training and support preparation. We are turning NFT onboarding from documentation into hands-on practice.
