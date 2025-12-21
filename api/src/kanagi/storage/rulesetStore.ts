// Rulesetストア

import fs from "fs/promises";
import path from "path";
import type { Ruleset } from "../types.js";

const RULESET_DIR = path.join(process.cwd(), "data", "kanagi", "rulesets");

/**
 * Rulesetディレクトリを初期化
 */
async function ensureRulesetDir(): Promise<void> {
  try {
    await fs.mkdir(RULESET_DIR, { recursive: true });
  } catch (error) {
    console.error(`Failed to create ruleset directory: ${error}`);
  }
}

/**
 * Rulesetを保存
 */
export async function saveRuleset(ruleset: Ruleset): Promise<void> {
  await ensureRulesetDir();
  
  const filePath = path.join(RULESET_DIR, `${ruleset.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(ruleset, null, 2), "utf-8");
}

/**
 * Rulesetを読み込み
 */
export async function loadRuleset(rulesetId: string): Promise<Ruleset | null> {
  try {
    const filePath = path.join(RULESET_DIR, `${rulesetId}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as Ruleset;
  } catch (error) {
    console.error(`Failed to load ruleset ${rulesetId}: ${error}`);
    return null;
  }
}

/**
 * 最新のRulesetを取得
 */
export async function getLatestRuleset(): Promise<Ruleset | null> {
  try {
    await ensureRulesetDir();
    const files = await fs.readdir(RULESET_DIR);
    
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    if (jsonFiles.length === 0) {
      return null;
    }
    
    // ファイル名でソート（最新のものを取得）
    jsonFiles.sort().reverse();
    const latestFile = jsonFiles[0];
    const rulesetId = latestFile.replace(".json", "");
    
    return await loadRuleset(rulesetId);
  } catch (error) {
    console.error(`Failed to get latest ruleset: ${error}`);
    return null;
  }
}

/**
 * すべてのRulesetをリスト
 */
export async function listRulesets(): Promise<Ruleset[]> {
  try {
    await ensureRulesetDir();
    const files = await fs.readdir(RULESET_DIR);
    
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    const rulesets: Ruleset[] = [];
    
    for (const file of jsonFiles) {
      const rulesetId = file.replace(".json", "");
      const ruleset = await loadRuleset(rulesetId);
      if (ruleset) {
        rulesets.push(ruleset);
      }
    }
    
    return rulesets.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error(`Failed to list rulesets: ${error}`);
    return [];
  }
}

