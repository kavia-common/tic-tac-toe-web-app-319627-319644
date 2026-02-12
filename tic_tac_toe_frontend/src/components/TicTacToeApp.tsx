import React, { useEffect, useMemo, useState } from 'react';

type Player = 'X' | 'O';
type Cell = Player | null;

type GameStatus =
	| { kind: 'IN_PROGRESS'; nextPlayer: Player }
	| { kind: 'WON'; winner: Player; line: [number, number, number] }
	| { kind: 'DRAW' };

const WIN_LINES: Array<[number, number, number]> = [
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8],
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8],
	[0, 4, 8],
	[2, 4, 6],
];

function computeStatus(board: Cell[], nextPlayer: Player): GameStatus {
	for (const line of WIN_LINES) {
		const [a, b, c] = line;
		if (board[a] && board[a] === board[b] && board[a] === board[c]) {
			return { kind: 'WON', winner: board[a], line };
		}
	}

	if (board.every((c) => c !== null)) {
		return { kind: 'DRAW' };
	}

	return { kind: 'IN_PROGRESS', nextPlayer };
}

function otherPlayer(p: Player): Player {
	return p === 'X' ? 'O' : 'X';
}

function getStatusText(status: GameStatus): string {
	switch (status.kind) {
		case 'IN_PROGRESS':
			return `Turn: ${status.nextPlayer}`;
		case 'WON':
			return `Winner: ${status.winner}`;
		case 'DRAW':
			return `Draw`;
	}
}

function getSubtitleText(status: GameStatus): string {
	switch (status.kind) {
		case 'IN_PROGRESS':
			return `Place a mark to continue.`;
		case 'WON':
			return `Nice play. Start a new round?`;
		case 'DRAW':
			return `No more moves. Start a new round?`;
	}
}

/** Simple deterministic id helper for mapping squares to labels. */
function squareLabel(i: number): string {
	const row = Math.floor(i / 3) + 1;
	const col = (i % 3) + 1;
	return `Row ${row}, Column ${col}`;
}

// PUBLIC_INTERFACE
export default function TicTacToeApp() {
	/**
	 * Full game state. We keep:
	 * - board (9 cells)
	 * - nextPlayer (whose turn is next)
	 * - score (wins per player)
	 */
	const [board, setBoard] = useState<Cell[]>(() => Array.from({ length: 9 }, () => null));
	const [nextPlayer, setNextPlayer] = useState<Player>('X');
	const [score, setScore] = useState<{ X: number; O: number }>({ X: 0, O: 0 });

	const status: GameStatus = useMemo(() => computeStatus(board, nextPlayer), [board, nextPlayer]);

	// Persist score (optional UX). Board state intentionally resets per refresh.
	useEffect(() => {
		try {
			const raw = localStorage.getItem('ttt_score');
			if (raw) {
				const parsed = JSON.parse(raw) as { X?: unknown; O?: unknown };
				const X = typeof parsed.X === 'number' ? parsed.X : 0;
				const O = typeof parsed.O === 'number' ? parsed.O : 0;
				setScore({ X, O });
			}
		} catch {
			// Ignore corrupt storage.
		}
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem('ttt_score', JSON.stringify(score));
		} catch {
			// Ignore storage failures.
		}
	}, [score]);

	function resetRound(startingPlayer: Player = nextPlayer) {
		setBoard(Array.from({ length: 9 }, () => null));
		setNextPlayer(startingPlayer);
	}

	function resetAll() {
		setScore({ X: 0, O: 0 });
		resetRound('X');
	}

	function handleSquareClick(index: number) {
		// Do nothing if already filled or game is finished.
		if (board[index] !== null) return;
		if (status.kind !== 'IN_PROGRESS') return;

		const newBoard = board.slice();
		newBoard[index] = status.nextPlayer;
		setBoard(newBoard);

		const upcomingNext = otherPlayer(status.nextPlayer);
		const newStatus = computeStatus(newBoard, upcomingNext);

		// If someone won, update score.
		if (newStatus.kind === 'WON') {
			setScore((prev) => ({ ...prev, [newStatus.winner]: prev[newStatus.winner] + 1 }));
		}

		// Only update nextPlayer if still in progress; otherwise keep it as "upcoming" starter for next round.
		if (newStatus.kind === 'IN_PROGRESS') {
			setNextPlayer(upcomingNext);
		} else {
			setNextPlayer(upcomingNext);
		}
	}

	const statusText = getStatusText(status);
	const subtitleText = getSubtitleText(status);

	const winningSet = useMemo(() => {
		if (status.kind !== 'WON') return new Set<number>();
		return new Set<number>(status.line);
	}, [status]);

	return (
		<div className="ttt-page">
			<header className="ttt-header">
				<div className="ttt-badge" aria-hidden="true">
					Tic Tac Toe
				</div>

				<h1 className="ttt-title">Play on the same device</h1>
				<p className="ttt-subtitle">{subtitleText}</p>

				<div className="ttt-status" role="status" aria-live="polite" aria-atomic="true">
					<span className="ttt-status-dot" aria-hidden="true" />
					<span className="ttt-status-text">{statusText}</span>
				</div>

				<section className="ttt-score" aria-label="Scoreboard">
					<div className="ttt-score-card">
						<div className="ttt-score-label">Player X</div>
						<div className="ttt-score-value">{score.X}</div>
					</div>
					<div className="ttt-score-card">
						<div className="ttt-score-label">Player O</div>
						<div className="ttt-score-value">{score.O}</div>
					</div>
				</section>
			</header>

			<main className="ttt-main">
				<section className="ttt-board-wrap" aria-label="Tic Tac Toe board">
					<div className="ttt-board" role="grid" aria-label="3 by 3 board">
						{board.map((cell, i) => {
							const isWinning = winningSet.has(i);
							const isDisabled = cell !== null || status.kind !== 'IN_PROGRESS';
							const label = cell
								? `${squareLabel(i)}: ${cell}`
								: `${squareLabel(i)}: empty. Place ${status.kind === 'IN_PROGRESS' ? status.nextPlayer : nextPlayer}.`;

							return (
								<button
									key={i}
									type="button"
									className={[
										'ttt-square',
										cell ? 'is-filled' : '',
										cell === 'X' ? 'is-x' : '',
										cell === 'O' ? 'is-o' : '',
										isWinning ? 'is-winning' : '',
									]
										.filter(Boolean)
										.join(' ')}
									onClick={() => handleSquareClick(i)}
									disabled={isDisabled}
									role="gridcell"
									aria-label={label}
								>
									<span className="ttt-mark" aria-hidden="true">
										{cell ?? ''}
									</span>
								</button>
							);
						})}
					</div>
				</section>

				<section className="ttt-controls" aria-label="Controls">
					<button
						type="button"
						className="ttt-btn ttt-btn-primary"
						onClick={() => resetRound(nextPlayer)}
					>
						New round
					</button>
					<button type="button" className="ttt-btn" onClick={resetAll}>
						Reset score
					</button>
				</section>
			</main>

			<footer className="ttt-footer">
				<p className="ttt-footer-text">
					Tip: Use the theme toggle in the top-right to switch light/dark mode.
				</p>
			</footer>

			<style>{`
				/* Component-scoped styles that reference the existing theme CSS variables in Layout.astro */
				.ttt-page{
					min-height: 100%;
					display:flex;
					flex-direction:column;
					align-items:center;
					justify-content:center;
					padding: 80px 16px 32px;
					box-sizing:border-box;
					font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
					background:
						radial-gradient(1200px 600px at 20% -10%, rgba(59,130,246,0.16), transparent 60%),
						radial-gradient(900px 520px at 90% 10%, rgba(6,182,212,0.14), transparent 55%),
						radial-gradient(900px 600px at 50% 120%, rgba(100,116,139,0.10), transparent 55%),
						linear-gradient(180deg, rgba(59,130,246,0.06), transparent 45%);
				}

				.ttt-header{
					width:min(720px, 100%);
					text-align:center;
					margin-bottom: 18px;
				}

				.ttt-badge{
					display:inline-flex;
					align-items:center;
					justify-content:center;
					padding: 6px 10px;
					border-radius: 999px;
					border: 1px solid var(--border-color);
					background: var(--card-bg);
					box-shadow: 0 6px 20px rgba(0,0,0,0.06);
					color: var(--text-secondary);
					font-size: 12px;
					letter-spacing: 0.08em;
					text-transform: uppercase;
					backdrop-filter: blur(10px);
				}

				.ttt-title{
					margin: 12px 0 6px;
					font-size: clamp(28px, 4.4vw, 40px);
					line-height: 1.1;
					color: var(--text-color);
				}

				.ttt-subtitle{
					margin: 0 0 14px;
					color: var(--text-secondary);
					font-size: 15px;
					line-height: 1.5;
				}

				.ttt-status{
					display:inline-flex;
					align-items:center;
					gap: 10px;
					padding: 10px 12px;
					border-radius: 14px;
					border: 1px solid var(--border-color);
					background: var(--card-bg);
					box-shadow: 0 10px 30px rgba(0,0,0,0.08);
					backdrop-filter: blur(10px);
				}

				.ttt-status-dot{
					width: 10px;
					height: 10px;
					border-radius: 999px;
					background: linear-gradient(135deg, #3b82f6, #06b6d4);
					box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
				}

				.ttt-status-text{
					font-weight: 600;
					color: var(--text-color);
					letter-spacing: -0.01em;
				}

				.ttt-score{
					margin-top: 14px;
					display:grid;
					grid-template-columns: 1fr 1fr;
					gap: 12px;
				}

				.ttt-score-card{
					border: 1px solid var(--border-color);
					background: var(--card-bg);
					border-radius: 16px;
					padding: 12px 14px;
					box-shadow: 0 12px 32px rgba(0,0,0,0.06);
					backdrop-filter: blur(10px);
					display:flex;
					align-items:center;
					justify-content:space-between;
				}

				.ttt-score-label{
					color: var(--text-secondary);
					font-size: 13px;
				}

				.ttt-score-value{
					font-size: 20px;
					font-weight: 800;
					color: var(--text-color);
				}

				.ttt-main{
					width:min(720px, 100%);
					display:flex;
					flex-direction:column;
					align-items:center;
					gap: 16px;
				}

				.ttt-board-wrap{
					width:100%;
					display:flex;
					justify-content:center;
				}

				.ttt-board{
					width: min(420px, 92vw);
					aspect-ratio: 1 / 1;
					display:grid;
					grid-template-columns: repeat(3, 1fr);
					gap: 12px;
					padding: 14px;
					border-radius: 22px;
					border: 1px solid var(--border-color);
					background: var(--card-bg);
					box-shadow: 0 18px 44px rgba(0,0,0,0.10);
					backdrop-filter: blur(12px);
				}

				.ttt-square{
					border: 1px solid var(--border-color);
					border-radius: 18px;
					background:
						linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.75));
					color: var(--text-color);
					cursor: pointer;
					transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.2s ease, border-color 0.2s ease;
					display:flex;
					align-items:center;
					justify-content:center;
					font-size: clamp(44px, 9vw, 72px);
					font-weight: 900;
					letter-spacing: -0.04em;
					user-select:none;
				}

				/* Dark theme square background using existing css variables */
				:global(body.dark-theme) .ttt-square{
					background: linear-gradient(180deg, rgba(31,41,55,0.95), rgba(31,41,55,0.75));
				}

				.ttt-square:hover:not(:disabled){
					transform: translateY(-2px);
					border-color: rgba(59,130,246,0.55);
					box-shadow: 0 16px 30px rgba(59,130,246,0.12);
				}

				.ttt-square:active:not(:disabled){
					transform: translateY(0px);
				}

				.ttt-square:disabled{
					cursor:not-allowed;
					opacity: 0.92;
				}

				.ttt-square.is-x .ttt-mark{
					background: linear-gradient(135deg, #3b82f6, #2563eb);
					-webkit-background-clip:text;
					background-clip:text;
					color: transparent;
				}

				.ttt-square.is-o .ttt-mark{
					background: linear-gradient(135deg, #06b6d4, #0891b2);
					-webkit-background-clip:text;
					background-clip:text;
					color: transparent;
				}

				.ttt-square.is-winning{
					border-color: rgba(239,68,68,0.55);
					box-shadow: 0 18px 42px rgba(239,68,68,0.12);
					background:
						radial-gradient(220px 220px at 50% 30%, rgba(239,68,68,0.18), transparent 60%),
						linear-gradient(180deg, rgba(255,255,255,0.90), rgba(255,255,255,0.70));
				}

				:global(body.dark-theme) .ttt-square.is-winning{
					background:
						radial-gradient(220px 220px at 50% 30%, rgba(239,68,68,0.18), transparent 60%),
						linear-gradient(180deg, rgba(31,41,55,0.95), rgba(31,41,55,0.70));
				}

				.ttt-controls{
					display:flex;
					gap: 12px;
					flex-wrap: wrap;
					justify-content:center;
				}

				.ttt-btn{
					border-radius: 14px;
					border: 1px solid var(--border-color);
					background: var(--card-bg);
					color: var(--text-color);
					padding: 10px 14px;
					font-weight: 700;
					cursor:pointer;
					transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.2s ease;
					box-shadow: 0 10px 22px rgba(0,0,0,0.06);
				}

				.ttt-btn:hover{
					transform: translateY(-1px);
					border-color: rgba(59,130,246,0.55);
					box-shadow: 0 14px 26px rgba(59,130,246,0.10);
				}

				.ttt-btn:active{
					transform: translateY(0px);
				}

				.ttt-btn-primary{
					border: 1px solid rgba(59,130,246,0.40);
					background: linear-gradient(135deg, rgba(59,130,246,0.95), rgba(6,182,212,0.95));
					color: white;
				}

				.ttt-footer{
					width:min(720px, 100%);
					margin-top: 18px;
					text-align:center;
				}

				.ttt-footer-text{
					margin:0;
					color: var(--text-secondary);
					font-size: 13px;
				}

				@media (max-width: 480px){
					.ttt-score{
						grid-template-columns: 1fr;
					}
					.ttt-page{
						padding-top: 84px; /* keep toggle from overlapping */
					}
				}
			`}</style>
		</div>
	);
}
