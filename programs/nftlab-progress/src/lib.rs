use anchor_lang::prelude::*;
declare_id!("FrqzKiz9NBHdy67LQ7SVx13SFoTkHHbbwv7LJTjxyXyp");

// Self-reported educational receipts. These are NOT instructor-attested
// credentials and do not verify quiz answers or Metaplex NFT operations.
#[program]
pub mod nftlab_progress {
    use super::*;
    pub fn record_scenario(ctx: Context<RecordScenario>, scenario: u8) -> Result<()> {
        require!(scenario < 3, LabError::InvalidScenario);
        let receipt = &mut ctx.accounts.receipt;
        if receipt.owner == Pubkey::default() {
            receipt.owner = ctx.accounts.learner.key();
            receipt.bump = ctx.bumps.receipt;
        }
        require_keys_eq!(receipt.owner, ctx.accounts.learner.key(), LabError::WrongOwner);
        let prior = (1u8 << scenario) - 1;
        require!(receipt.completed & prior == prior, LabError::OutOfOrder);
        receipt.completed |= 1u8 << scenario;
        if receipt.completed == 7 && receipt.completed_at == 0 {
            receipt.completed_at = Clock::get()?.unix_timestamp;
        }
        emit!(ScenarioRecorded { learner: receipt.owner, scenario });
        Ok(())
    }
}
#[derive(Accounts)]
pub struct RecordScenario<'info> {
    #[account(init_if_needed, payer = learner, space = 8 + 32 + 1 + 8 + 1,
        seeds = [b"progress", learner.key().as_ref()], bump)]
    pub receipt: Account<'info, LearningReceipt>,
    #[account(mut)]
    pub learner: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[account]
pub struct LearningReceipt {
    pub owner: Pubkey,
    pub completed: u8,
    pub completed_at: i64,
    pub bump: u8,
}
#[event]
pub struct ScenarioRecorded { pub learner: Pubkey, pub scenario: u8 }
#[error_code]
pub enum LabError {
    #[msg("Scenario must be 0, 1 or 2")] InvalidScenario,
    #[msg("Previous scenario must be recorded first")] OutOfOrder,
    #[msg("Receipt belongs to another learner")] WrongOwner,
}
