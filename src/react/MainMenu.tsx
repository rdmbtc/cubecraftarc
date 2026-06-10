import React, { useEffect, useMemo } from 'react'
import { openURL } from 'renderer/viewer/lib/simpleUtils'
import { useSnapshot } from 'valtio'
import { haveDirectoryPicker } from '../utils'
import { ConnectOptions } from '../connect'
import { miscUiState } from '../globalState'
import {
  isRemoteSplashText,
  loadRemoteSplashText,
  getCachedSplashText,
  cacheSplashText,
  cacheSourceUrl,
  clearSplashCache
} from '../utils/splashText'
import styles from './mainMenu.module.css'
import Button from './Button'
import ButtonWithTooltip from './ButtonWithTooltip'
import { pixelartIcons } from './PixelartIcon'
import useLongPress from './useLongPress'
import PauseLinkButtons from './PauseLinkButtons'
import CreditsBookButton from './CreditsBookButton'
import { withInjectableUi } from './extendableSystem'
import { walletState } from '../blockchain/walletState'

type Action = (e: React.MouseEvent<HTMLButtonElement>) => void

interface Props {
  connectToServerAction?: Action
  singleplayerAction?: Action
  optionsAction?: Action
  githubAction?: Action
  openFileAction?: Action
  walletAction?: Action
  landMarketAction?: Action
  businessAction?: Action
  economyAction?: Action
  mapsProvider?: string
  versionStatus?: string
  versionTitle?: string
  onVersionStatusClick?: () => void
  bottomRightLinks?: string
  versionText?: string
  onVersionTextClick?: () => void
  singleplayerAvailable?: boolean
}

const httpsRegex = /^https?:\/\//

const MainMenuBase = ({
  connectToServerAction,
  mapsProvider,
  singleplayerAction,
  optionsAction,
  githubAction,
  openFileAction,
  walletAction,
  landMarketAction,
  businessAction,
  economyAction,
  versionText,
  onVersionTextClick,
  versionStatus,
  versionTitle,
  onVersionStatusClick,
  bottomRightLinks,
  singleplayerAvailable = true,
}: Props) => {
  const { appConfig } = useSnapshot(miscUiState)
  const wallet = useSnapshot(walletState)

  const splashText = useMemo(() => {
    const cachedText = getCachedSplashText()

    const configSplashFromApp = appConfig?.splashText
    const isRemote = configSplashFromApp && isRemoteSplashText(configSplashFromApp)
    const sourceKey = isRemote ? configSplashFromApp : (configSplashFromApp || '')
    const storedSourceKey = localStorage.getItem('minecraft_splash_url')

    if (storedSourceKey !== sourceKey) {
      clearSplashCache()
      cacheSourceUrl(sourceKey)
    } else if (cachedText) {
      return cachedText
    }

    if (!isRemote && configSplashFromApp && configSplashFromApp.trim() !== '') {
      cacheSplashText(configSplashFromApp)
      return configSplashFromApp
    }

    return appConfig?.splashTextFallback || ''
  }, [])

  useEffect(() => {
    const configSplashFromApp = appConfig?.splashText
    if (configSplashFromApp && isRemoteSplashText(configSplashFromApp)) {
      loadRemoteSplashText(configSplashFromApp)
        .then(fetchedText => {
          if (fetchedText && fetchedText.trim() !== '' && !fetchedText.includes('Failed to load')) {
            cacheSplashText(fetchedText)
          }
        })
        .catch(error => {
          console.error('Failed to preload splash text for next session:', error)
        })
    }
  }, [appConfig?.splashText])

  if (!bottomRightLinks?.trim()) bottomRightLinks = undefined
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const linksParsed = bottomRightLinks?.split(/;|\n/g).map(l => {
    const parts = l.split(':')
    return [parts[0], parts.slice(1).join(':')]
  }) as Array<[string, string]> | undefined

  const singleplayerLongPress = useLongPress(
    () => {
      window.location.href = window.location.pathname + '?sp=1'
    },
    () => singleplayerAction?.(null as any),
    { delay: 500 }
  )

  const versionLongPress = useLongPress(
    () => {
      const buildDate = process.env.BUILD_VERSION ? new Date(process.env.BUILD_VERSION + ':00:00.000Z') : null
      const hoursAgo = buildDate ? Math.round((Date.now() - buildDate.getTime()) / (1000 * 60 * 60)) : null
      alert(`BUILD DATE:\n${buildDate?.toLocaleString() || 'Development build'}${hoursAgo ? `\nBuilt ${hoursAgo} hours ago` : ''}`)
    },
    () => onVersionTextClick?.(),
  )

  const connectToServerLongPress = useLongPress(
    () => {
      if (process.env.NODE_ENV === 'development') {
        // Connect to <origin>:25565
        const origin = window.location.hostname
        const connectOptions: ConnectOptions = {
          server: `${origin}:25565`,
          username: 'test',
        }
        dispatchEvent(new CustomEvent('connect', { detail: connectOptions }))
      }
    },
    () => connectToServerAction?.(null as any),
    { delay: 500 }
  )

  return (
    <div className={styles.root}>
      <div className={styles['game-title']}>
        <div className={styles.minecraft}>
          <div className={styles.edition} />
          <span className={styles.splash}>{splashText}</span>
        </div>
      </div>

      <div className={styles.menu}>
        <ButtonWithTooltip
          initialTooltip={{
            content: 'Enter the Tycoon World and build your empire!',
            placement: 'top',
          }}
          {...connectToServerLongPress}
          data-test-id='servers-screen-button'
        >
          🎮 Enter Tycoon World
        </ButtonWithTooltip>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <ButtonWithTooltip
            style={{ width: 150 }}
            {...singleplayerLongPress}
            data-test-id='singleplayer-button'
            disabled={!singleplayerAvailable}
            initialTooltip={{
              content: 'Build your own world offline',
              placement: 'left',
              offset: -40
            }}
          >
            🏗️ Build Mode
          </ButtonWithTooltip>

          <ButtonWithTooltip
            disabled={!mapsProvider}
            // className={styles['maps-provider']}
            icon={pixelartIcons.map}
            initialTooltip={{ content: 'Explore maps to play from provider!', placement: 'top-start' }}
            onClick={() => mapsProvider && openURL(httpsRegex.test(mapsProvider) ? mapsProvider : 'https://' + mapsProvider, false)}
          />

          <ButtonWithTooltip
            data-test-id='select-file-folder'
            icon={pixelartIcons.folder}
            onClick={openFileAction}
            initialTooltip={{
              content: 'Load any Java world save' + (haveDirectoryPicker() ? '' : ' (zip)!'),
              placement: 'bottom-start',
            }}
          />
        </div>

        {/* Blockchain buttons row */}
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            onClick={walletAction}
            style={{ flex: 1, fontSize: 12, position: 'relative' }}
          >
            💰 Wallet{wallet.connected ? ' ✓' : ''}
          </Button>
          <Button
            onClick={landMarketAction}
            style={{ flex: 1, fontSize: 12 }}
          >
            🌍 Land Market
          </Button>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            onClick={businessAction}
            style={{ flex: 1, fontSize: 12 }}
          >
            🏪 Businesses
          </Button>
          <Button
            onClick={economyAction}
            style={{ flex: 1, fontSize: 12 }}
          >
            📊 Economy
          </Button>
        </div>

        <Button
          onClick={optionsAction}
        >
          Options
        </Button>
        <div className={styles['menu-row']}>
          <PauseLinkButtons />
        </div>
        <CreditsBookButton />
      </div>

      <div className={styles['bottom-info']}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 10, color: 'gray' }} {...versionLongPress}>{versionText}</span>
          <span
            title={`${versionTitle} (click to reload)`}
            onClick={onVersionStatusClick}
            className={styles['product-info']}
          >
            CubeCraft Arc Tycoon {versionStatus}
          </span>
        </div>
        <span className={styles['product-description']}>
          <div className={styles['product-link']}>
            {linksParsed?.map(([name, link], i, arr) => {
              if (!link.startsWith('http')) link = `https://${link}`
              const finalLink = link
              return <div style={{
                color: 'lightgray',
                fontSize: 8,
              }}>
                <a
                  key={name}
                  style={{
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    openURL(finalLink, false)
                  }}
                >{name}
                </a>
                {i < arr.length - 1 && <span style={{ marginLeft: 2 }}>·</span>}
              </div>
            })}
          </div>
          <span>{appConfig?.rightSideText}</span>
        </span>
      </div>
    </div>
  )
}

export default withInjectableUi(MainMenuBase, 'mainMenu')
