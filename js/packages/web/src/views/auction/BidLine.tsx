import React, { useEffect, useState } from 'react';
import {
  BidderMetadata,
  formatUSD,
  fromLamports,
  getTwitterHandle,
  Identicon,
  ParsedAccount,
  shortenAddress,
  useConnection,
} from '@oyster/common';
import { MintInfo } from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSolPrice } from '../../contexts';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/solid';
import { DateTime } from 'luxon';

export default function BidLine(props: {
  bid: ParsedAccount<BidderMetadata>;
  mint?: MintInfo;
}) {
  const { bid, mint } = props;
  const { publicKey } = useWallet();
  const bidder = bid.info.bidderPubkey;
  const isMe = publicKey?.toBase58() === bidder;

  const amount = fromLamports(bid.info.lastBid, mint);

  const connection = useConnection();
  const [bidderTwitterHandle, setBidderTwitterHandle] = useState('');
  useEffect(() => {
    getTwitterHandle(connection, bidder).then(
      tw => tw && setBidderTwitterHandle(tw),
    );
  }, []);

  const solPrice = useSolPrice();

  const [priceUSD, setPriceUSD] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (solPrice !== undefined) setPriceUSD(solPrice * amount);
  }, [amount, solPrice]);

  return (
    <li>
      <div className="flex items-center px-4 py-4 sm:px-6">
        <div className="min-w-0 flex-1 flex items-center">
          <div className="flex-shrink-0 pr-4">
            <Identicon size={48} address={bidder} />
          </div>
          <div className="min-w-0 flex-1 flex justify-between">
            <div>
              <a href={`https://www.holaplex.com/profiles/${bidder}`}>
                <p className="text-base font-medium text-white hover:text-primary truncate flex items-center">
                  {bidderTwitterHandle
                    ? `@${bidderTwitterHandle}`
                    : shortenAddress(bidder)}
                  {isMe && (
                    <span>
                      <CheckCircleIcon
                        className="flex-shrink-0 ml-1.5 h-5 w-5 text-primary"
                        aria-hidden="true"
                      />
                    </span>
                  )}
                </p>
              </a>
              <p className="mt-2 flex items-center text-sm text-gray-500">
                <ClockIcon
                  className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400"
                  aria-hidden="true"
                />
                <span>
                  {DateTime.fromMillis(
                    bid.info.lastBidTimestamp.toNumber() * 1000,
                  ).toRelative({
                    style: 'narrow',
                  })}
                </span>
              </p>
            </div>
            <div className=" ">
              <div>
                <p className="text-lg text-white flex justify-end items-center">
                  <svg
                    className="mr-[5px] h-4 w-4 text-white"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="8" cy="8" r="7.5" stroke="white" />
                    <circle cx="8" cy="8" r="3.5" stroke="white" />
                  </svg>
                  {amount.toLocaleString()}
                </p>

                <p className="mt-2 flex items-center text-sm text-gray-500 justify-end">
                  {formatUSD.format(priceUSD || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
