import { Pool, type PoolConfig } from "pg";

export async function testRemoteConnection(config: PoolConfig): Promise<{
  success: boolean;
  message?: string;
}> {
  const pool = new Pool(config);
  try {
    await pool.query("SELECT 1");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    await pool.end();
  }
}
