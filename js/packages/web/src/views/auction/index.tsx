import {
  CheckOutlined,
  InfoCircleFilled,
  LoadingOutlined,
} from '@ant-design/icons';
import {
  AuctionState,
  BidderMetadata,
  Identicon,
  MetaplexModal,
  ParsedAccount,
  shortenAddress,
  StringPublicKey,
  toPublicKey,
  useConnection,
  useMint,
  useMeta,
  subscribeProgramChanges,
  AUCTION_ID,
  processAuctions,
  METAPLEX_ID,
  processMetaplexAccounts,
  VAULT_ID,
  processVaultData,
  fromLamports,
  formatUSD,
} from '@oyster/common';
import { actions } from '@metaplex/js';
import { PublicKey } from '@solana/web3.js';
import cx from 'classnames';
import { AuctionViewItem } from '@oyster/common/dist/lib/models/metaplex/index';
import { getHandleAndRegistryKey } from '@solana/spl-name-service';
import { MintInfo } from '@solana/spl-token';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import {
  Button,
  Carousel,
  List,
  Skeleton,
  Spin,
  Tooltip,
  notification,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
} from '@heroicons/react/solid';
import { DateTime } from 'luxon';
import { AmountLabel } from '../../components/AmountLabel';
import { ArtContent } from '../../components/ArtContent';
import { AuctionCard } from '../../components/AuctionCard';
import { ClickToCopy } from '../../components/ClickToCopy';
import { ViewOn } from '../../components/ViewOn';
import { some } from 'lodash';
import {
  AuctionView as Auction,
  useArt,
  useAuction,
  useBidsForAuction,
  useCreators,
  useExtendedArt,
  useWinningBidsForAuction,
} from '../../hooks';
import { ArtType } from '../../types';
import useWindowDimensions from '../../utils/layout';
import { Card } from 'antd';
import { useSolPrice } from '../../contexts';

export const AuctionItem = ({
  item,
  active,
}: {
  item: AuctionViewItem;
  active?: boolean;
}) => {
  const id = item.metadata.pubkey;

  return (
    <ArtContent
      pubkey={id}
      active={active}
      allowMeshRender={true}
      backdrop="dark"
      square={false}
    />
  );
};

export const AuctionView = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <></>;
  }

  const { loading, auction } = useAuction(id);
  const connection = useConnection();
  const { patchState } = useMeta();
  const [currentIndex, setCurrentIndex] = useState(0);
  const art = useArt(auction?.thumbnail?.metadata?.pubkey);
  const { ref, data } = useExtendedArt(auction?.thumbnail?.metadata?.pubkey);
  const creators = useCreators(auction);
  const wallet = useWallet();
  let edition = '';
  if (art.type === ArtType.NFT) {
    edition = 'Unique';
  } else if (art.type === ArtType.Master) {
    edition = 'NFT 0';
  } else if (art.type === ArtType.Print) {
    edition = `${art.edition} of ${art.supply}`;
  }
  const nftCount = auction?.items.flat().length;
  const winnerCount = auction?.items.length;

  const description = data?.description;
  const attributes = data?.attributes;

  useEffect(() => {
    return subscribeProgramChanges(
      connection,
      patchState,
      {
        programId: AUCTION_ID,
        processAccount: processAuctions,
      },
      {
        programId: METAPLEX_ID,
        processAccount: processMetaplexAccounts,
      },
      {
        programId: VAULT_ID,
        processAccount: processVaultData,
      },
    );
  }, [connection]);

  if (loading) {
    return (
      <div className="app-section--loading">
        <Spin indicator={<LoadingOutlined />} />
      </div>
    );
  }

  const items = [
    ...(auction?.items
      .flat()
      .reduce((agg, item) => {
        agg.set(item.metadata.pubkey, item);
        return agg;
      }, new Map<string, AuctionViewItem>())
      .values() || []),
    auction?.participationItem,
  ].map((item, index) => {
    if (!item || !item?.metadata || !item.metadata?.pubkey) {
      return null;
    }

    return (
      <AuctionItem
        key={item.metadata.pubkey}
        item={item}
        active={index === currentIndex}
      />
    );
  });

  const getArt = (className: string) => (
    <div className={className}>
      <Carousel
        className="metaplex-margin-bottom-8"
        autoplay={false}
        afterChange={index => setCurrentIndex(index)}
      >
        {items}
      </Carousel>
    </div>
  );

  const getDescriptionAndAttributes = (className: string) => (
    <div className={className}>
      {description && (
        <>
          <h3 className="info-header">Description</h3>
          <p>{description}</p>
        </>
      )}

      {attributes && attributes.length > 0 && (
        <div>
          <h3 className="info-header">Attributes</h3>
          <List grid={{ column: 4 }}>
            {attributes.map((attribute, index) => (
              <List.Item key={`${attribute.value}-${index}`}>
                <List.Item.Meta
                  title={attribute.trait_type}
                  description={attribute.value}
                />
              </List.Item>
            ))}
          </List>
        </div>
      )}
    </div>
  );

  return (
    <div className="item-page-wrapper" ref={ref}>
      <div className="item-page-left">
        {getArt('art-desktop')}
        {getDescriptionAndAttributes('art-desktop')}
      </div>

      <div className="item-page-right">
        <div className="title-row">
          <h1>{art.title || <Skeleton paragraph={{ rows: 0 }} />}</h1>
          <ViewOn art={art} />
        </div>

        {getArt('art-mobile')}
        {getDescriptionAndAttributes('art-mobile')}

        {wallet.publicKey?.toBase58() === auction?.auctionManager.authority && (
          <Link to={`/listings/${id}/billing`}>
            <Button type="ghost" className="metaplex-margin-bottom-8">
              Billing / Settlement
            </Button>
          </Link>
        )}

        <div className="info-outer-wrapper">
          <div className="info-items-wrapper">
            <div className="info-item-wrapper">
              <span className="item-title">
                {creators.length > 1 ? 'Creators' : 'Creator'}
              </span>
              {creators.map(creator => (
                <span className="info-address" key={creator.address}>
                  {shortenAddress(creator.address || '')}
                </span>
              ))}
            </div>
            <div className="info-item-wrapper">
              <span className="item-title">Edition</span>
              <span>
                {(auction?.items.length || 0) > 1
                  ? 'Multiple'
                  : edition === 'NFT 0'
                  ? 'Master'
                  : edition}
              </span>
            </div>
            <div className="info-item-wrapper">
              <span className="item-title">Winners</span>
              <span>
                {winnerCount === undefined ? (
                  <Skeleton paragraph={{ rows: 0 }} />
                ) : (
                  winnerCount
                )}
              </span>
            </div>
            <div className="info-item-wrapper">
              <span className="item-title">NFTs</span>
              <span>
                {nftCount === undefined ? (
                  <Skeleton paragraph={{ rows: 0 }} />
                ) : (
                  nftCount
                )}
              </span>
            </div>
            {(auction?.items.length || 0) > 1 && (
              <div className="info-item-wrapper">
                <span className="item-title">Remaining</span>
                <span>
                  {art.maxSupply === undefined ? (
                    <Skeleton paragraph={{ rows: 0 }} />
                  ) : (
                    <span>
                      {`${(art.maxSupply || 0) - (art.supply || 0)} of ${
                        art.maxSupply || 0
                      } `}
                      <Tooltip title="Max supply may include items from previous listings">
                        <InfoCircleFilled size={12} />
                      </Tooltip>
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="margin-bottom-7">
          {!auction && <Skeleton paragraph={{ rows: 6 }} />}
          {auction && (
            <AuctionCard auctionView={auction} hideDefaultAction={false} />
          )}
        </div>
        {!auction?.isInstantSale && <AuctionBids auctionView={auction} />}
      </div>
    </div>
  );
};

const BidLine = (props: {
  bid: ParsedAccount<BidderMetadata>;
  index: number;
  mint?: MintInfo;
  isCancelled?: boolean;
  isActive?: boolean;
  isLastWinner?: boolean;
}) => {
  const { bid, mint, isCancelled, isLastWinner } = props;
  const { publicKey } = useWallet();
  const bidder = bid.info.bidderPubkey;
  const isme = publicKey?.toBase58() === bidder;

  // Get Twitter Handle from address
  const connection = useConnection();
  const [bidderTwitterHandle, setBidderTwitterHandle] = useState('');
  useEffect(() => {
    const getTwitterHandle = async (
      connection: Connection,
      bidder: StringPublicKey,
    ): Promise<string | undefined> => {
      try {
        const [twitterHandle] = await getHandleAndRegistryKey(
          connection,
          toPublicKey(bidder),
        );
        setBidderTwitterHandle(twitterHandle);
      } catch (err) {
        console.warn(`err`);
        return undefined;
      }
    };
    getTwitterHandle(connection, bidder);
  }, [bidderTwitterHandle]);

  return (
    <div
      className={cx(
        'metaplex-fullwidth',
        'auction-bid-line-item',
        'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
        {
          'auction-bid-last-winner': isLastWinner,
        },
      )}
    >
      <div
        className={cx(
          'metaplex-flex',
          'metaplex-align-items-center',
          'metaplex-gap-2',
          'md:w-44',
          {
            'auction-bid-line-item-is-canceled':
              isCancelled && publicKey?.toBase58() === bidder,
          },
        )}
      >
        <AmountLabel
          displaySOL={true}
          amount={fromLamports(bid.info.lastBid, mint)}
          customPrefix={
            <svg
              className="mr-[5px] h-4 w-4 text-white"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="8" cy="8" r="7.5" stroke="white" />
              <circle cx="8" cy="8" r="3.5" stroke="white" />
            </svg>
          }
        />
        {isme && <CheckOutlined style={{ marginTop: '-8px' }} />}
      </div>

      <div className="justify-self-center">
        {/* uses milliseconds */}
        {/* {format(bid.info.lastBidTimestamp.toNumber() * 1000)} */}
        {DateTime.fromMillis(
          bid.info.lastBidTimestamp.toNumber() * 1000,
        ).toRelative({
          style: 'narrow',
        })}
      </div>

      <div className="metaplex-flex metaplex-gap-4 md:w-64 truncate justify-end">
        <Identicon size={24} address={bidder} />
        {bidderTwitterHandle ? (
          <a
            target="_blank"
            rel="noopener noreferrer"
            title={shortenAddress(bidder)}
            href={`https://twitter.com/${bidderTwitterHandle}`}
          >{`@${bidderTwitterHandle}`}</a>
        ) : (
          shortenAddress(bidder)
        )}
        <ClickToCopy copyText={bidder} />
      </div>
    </div>
  );
};

export const AuctionBids = ({
  auctionView,
}: {
  auctionView?: Auction | null;
}) => {
  const auctionPubkey = auctionView?.auction.pubkey || '';
  const bids = useBidsForAuction(auctionPubkey);
  const connection = useConnection();
  const wallet = useWallet();
  const [cancellingBid, setCancellingBid] = useState(false);

  const mint = useMint(auctionView?.auction.info.tokenMint);
  const { width } = useWindowDimensions();

  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  const winnersCount = auctionView?.auction.info.bidState.max.toNumber() || 0;
  const activeBids = auctionView?.auction.info.bidState.bids || [];
  const winners = useWinningBidsForAuction(auctionPubkey);
  const isWinner = some(
    winners,
    bid => bid.info.bidderPubkey === wallet.publicKey?.toBase58(),
  );
  const auctionState = auctionView
    ? auctionView.auction.info.state
    : AuctionState.Created;
  const auctionRunning = auctionState !== AuctionState.Ended;

  const activeBidders = useMemo(() => {
    return new Set(activeBids.map(b => b.key));
  }, [activeBids]);
  const bidLines = useMemo(() => {
    let activeBidIndex = 0;
    return bids.map((bid, index) => {
      const isCancelled =
        (index < winnersCount && !!bid.info.cancelled) ||
        (auctionRunning && !!bid.info.cancelled);

      const line = (
        <BidLine
          bid={bid}
          index={activeBidIndex}
          key={bid.pubkey}
          mint={mint}
          isLastWinner={index + 1 === winners.length}
          isCancelled={isCancelled}
          isActive={!bid.info.cancelled}
        />
      );

      if (!isCancelled) {
        activeBidIndex++;
      }

      return line;
    });
  }, [auctionState, bids, activeBidders]);

  if (!auctionView || bids.length < 1) return null;

  return (
    <div>
      <Card
        bordered={false}
        className="metaplex-margin-bottom-4 auction-card"
        title={'Bid history'}
        bodyStyle={{ padding: 0 }}
      >
        <div className=" overflow-hidden">
          <ul role="list" className="divide-y divide-gray-900">
            {bids.map(bid => (
              <BidLine2 bid={bid} key={bid.pubkey} mint={mint} />
            ))}
          </ul>
        </div>
      </Card>

      <div>
        {/* <p className="metaplex-margin-bottom-4">Bid History</p> */}
        {auctionRunning &&
          auctionView.myBidderMetadata &&
          !auctionView.myBidderMetadata.info.cancelled && (
            <Tooltip
              placement="right"
              title="You are currently a winning bid, and thus can not cancel your bid."
              trigger={isWinner ? ['hover'] : []}
            >
              <Button
                type="ghost"
                disabled={isWinner}
                loading={cancellingBid}
                onClick={async () => {
                  const myBidderPot = auctionView.myBidderPot;

                  if (!myBidderPot) {
                    return;
                  }

                  setCancellingBid(true);

                  try {
                    await actions.cancelBid({
                      connection,
                      //@ts-ignore
                      wallet,
                      auction: new PublicKey(auctionView.auction.pubkey),
                      bidderPotToken: new PublicKey(myBidderPot.info.bidderPot),
                    });

                    notification.success({
                      message: 'Bid Cancelled',
                      description:
                        'Your bid was successfully cancelled. You may rebid to enter the auction again.',
                    });
                  } catch {
                    notification.error({
                      message: 'Bid Cancel Error',
                      description:
                        'There was an issue cancelling your bid. Please check your transaction history and try again.',
                    });
                  } finally {
                    setCancellingBid(false);
                  }
                }}
              >
                Cancel Bid
              </Button>
            </Tooltip>
          )}
      </div>
      {/* <div className="space-y-8 md:space-y-0">{bidLines.slice(0, 10)}</div> */}
      {bids.length > 10 && (
        <Button onClick={() => setShowHistoryModal(true)}>
          View full history
        </Button>
      )}
      <MetaplexModal
        visible={showHistoryModal}
        onCancel={() => setShowHistoryModal(false)}
        title="Bid history"
        centered
        width={width < 768 ? width - 10 : 600}
      >
        {bidLines}
      </MetaplexModal>
    </div>
  );
};

export const BidLine2 = (props: {
  bid: ParsedAccount<BidderMetadata>;
  mint?: MintInfo;
}) => {
  const { bid, mint } = props;
  const { publicKey } = useWallet();
  const bidder = bid.info.bidderPubkey;
  const isMe = publicKey?.toBase58() === bidder;

  const amount = fromLamports(bid.info.lastBid, mint);

  const connection = useConnection();
  const [bidderTwitterHandle, setBidderTwitterHandle] = useState('');
  useEffect(() => {
    const getTwitterHandle = async (
      connection: Connection,
      bidder: StringPublicKey,
    ): Promise<string | undefined> => {
      try {
        const [twitterHandle] = await getHandleAndRegistryKey(
          connection,
          toPublicKey(bidder),
        );
        setBidderTwitterHandle(twitterHandle);
      } catch (err) {
        console.warn(`err`);
        return undefined;
      }
    };
    getTwitterHandle(connection, bidder);
  }, [bidderTwitterHandle]);

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
              <a href={`https://www.holaplex.com/profiles/${bidder}/activity`}>
                <p className="text-base font-medium text-white hover:text-primary truncate flex items-center">
                  {bidderTwitterHandle
                    ? `@${bidderTwitterHandle}`
                    : shortenAddress(bidder)}
                  {isMe && (
                    <span>
                      <CheckCircleIcon
                        className="flex-shrink-0 ml-1.5 h-5 w-5 text-green-400"
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
};
