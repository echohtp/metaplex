import { Button, Dropdown, Menu } from 'antd';
import { ButtonProps } from 'antd/lib/button';
import React, { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '../../contexts';

export interface ConnectButtonProps
  extends ButtonProps,
    React.RefAttributes<HTMLElement> {
  allowWalletChange?: boolean;
  className?: string;
}

export const ConnectButton = (props: ConnectButtonProps) => {
  const { onClick, children, disabled, allowWalletChange, className, ...rest } =
    props;
  const { wallet, connect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const open = useCallback(() => setVisible(true), [setVisible]);

  const handleClick = useCallback(
    () => (wallet ? connect().catch(() => {}) : open()),
    [wallet, connect, open],
  );

  // only show if wallet selected or user connected

  if (!wallet || !allowWalletChange) {
    return (
      <Button
        className={className || 'connector'}
        {...rest}
        onClick={e => {
          onClick && onClick(e);
          handleClick();
        }}
        disabled={connected && disabled}
      >
        {connected ? children : 'Connect Wallet'}
      </Button>
    );
  }

  return (
    <Dropdown.Button
      className={className || 'connector'}
      onClick={handleClick}
      disabled={connected && disabled}
      overlay={
        <Menu>
          <Menu.Item onClick={open}>Change Wallet</Menu.Item>
        </Menu>
      }
    >
      Connect
    </Dropdown.Button>
  );
};
