import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../server/db/client";
import { v4 as uuidv4 } from "uuid";
import CryptoJS from "crypto-js";
import { cryptPassword } from "../../server/pass";
import Base58 from "bs58";

import {
  Keypair,
  clusterApiUrl,
  Connection,
  Transaction,
  Message,
  PublicKey,
} from "@solana/web3.js";
import NextCors from "nextjs-cors";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { access, secret, from, signature, tx } = req.body;
  console.log(new PublicKey(from));
  await NextCors(req, res, {
    // Options
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    origin: "*",
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  });
  const cred = await prisma.keys.findFirst({
    where: {
      access,
    },
  });

  if (!cred) {
    res.status(404).json({
      success: false,
      message: "Credentials not found",
    });
    return;
  }
  const masterKey = CryptoJS.AES.decrypt(cred.secret, secret).toString(
    CryptoJS.enc.Utf8
  );
  const array = masterKey.split(",").map((x) => parseInt(x));
  const keyPair = Keypair.fromSecretKey(Uint8Array.from(array));
  console.log(keyPair.publicKey.toString());

  let connection = new Connection(clusterApiUrl("devnet"));

  const transaction = Transaction.populate(
    Message.from(Buffer.from(tx, "base64"))
  );

  transaction.partialSign(keyPair);
  transaction.addSignature(
    new PublicKey(from),
    Buffer.from(Base58.decode(signature))
  );
  console.log(transaction.signatures);

  console.log("cjhcj3h3jch");

  const result = await connection.sendEncodedTransaction(
    transaction.serialize().toString("base64")
  );

  console.log(result);
  return res.status(200).json({
    success: true,
    result,
  });
}
