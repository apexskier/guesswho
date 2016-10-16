import * as React from "react";
import * as FB from "FB";
import autobind = require("autobind-decorator");

import "./Tile.css";


interface TileProps {
    friend: UserInfo;
    onClick: (ev: React.MouseEvent) => void;
    chosen: boolean;
    pendingElimination: boolean;
    eliminated: boolean;
}

interface TileState {
}

interface WithClientCoords {
    clientY: number;
    clientX: number;
}

function getWindowSize() {
    return {
        width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
        height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
    };
}

export default class Tile extends React.Component<TileProps, TileState> {
    private trackedTouch: number | null = null;
    private previousTransform: string | null = null;
    private zoomTimeout: number;

    private onScrubStart(el: HTMLElement) {
        el.addEventListener("transitionend", this.removeTransition);
    }

    private onScrubEnd(el: HTMLElement) {
        el.removeEventListener("transitionend", this.removeTransition);
        el.style.transform = null;
        el.style.transition = null;
    }

    private onScrubMove(el: HTMLElement, ev: WithClientCoords) {
        if (this.previousTransform === null) {
            const rect = el.getBoundingClientRect();
            const xDeg = (((ev.clientY - rect.top) / rect.height) - .5) * 20;
            const yDeg = (((ev.clientX - rect.left) / rect.width) - .5) * 20;
            el.style.transform = `translateZ(10px) rotateY(${-yDeg}deg) rotateX(${xDeg}deg)`;
        }
    }

    private delayStartZoom(el: HTMLElement) {
        this.zoomTimeout = window.setTimeout(() => this.startZoom(el), 400);
    }

    private startZoom(el: HTMLElement) {
        el.classList.add("game-tile-zoomed");
        this.previousTransform = el.style.transform;
        const rect = el.getBoundingClientRect();
        const rectMid = rect.left + rect.width / 2;
        const wSize = getWindowSize();
        const moveX = (wSize.width / 2) - rectMid;
        console.log(rectMid, wSize.width, moveX);
        el.style.transition = null;
        el.style.transform = `scale(3) translateZ(30px) translateX(${moveX / 3}px)`;
        el.style.zIndex = `100`;
        el.removeEventListener("transitionend", this.removeZIndex);
    }

    private stopZoom(el: HTMLElement) {
        window.clearTimeout(this.zoomTimeout);
        el.classList.remove("game-tile-zoomed");
        el.style.transition = null;
        el.style.transform = this.previousTransform;
        this.previousTransform = null;
        el.addEventListener("transitionend", this.removeZIndex);
    }

    @autobind
    private removeZIndex(ev: Event) {
        const el = (ev.currentTarget as HTMLElement);
        el.style.zIndex = null;
        el.removeEventListener("transitionend", this.removeZIndex);
    }

    @autobind
    private removeTransition(ev: Event) {
        const el = (ev.currentTarget as HTMLElement);
        el.style.transition = "none";
        el.removeEventListener("transitionend", this.removeTransition);
    }

    @autobind
    private onMouseMove(ev: React.MouseEvent) {
        this.onScrubMove(ev.currentTarget as HTMLElement, ev);
        window.clearTimeout(this.zoomTimeout);
    }

    @autobind
    private onMouseOver(ev: React.MouseEvent) {
        this.onScrubStart(ev.currentTarget as HTMLElement);
    }

    @autobind
    private onMouseOut(ev: React.MouseEvent) {
        this.onScrubEnd(ev.currentTarget as HTMLElement);
        this.stopZoom(ev.currentTarget as HTMLElement);
    }

    @autobind
    private onTouchMove(ev: React.TouchEvent) {
        if (this.trackedTouch !== null) {
            const touch = Array.from(ev.changedTouches).find((t) => t.identifier === this.trackedTouch);
            if (touch) {
                this.onScrubMove(ev.currentTarget as HTMLElement, touch);
                if (!this.previousTransform) {
                    // ev.preventDefault();
                }
            }
        }
    }

    @autobind
    private onTouchStart(ev: React.TouchEvent) {
        if (this.trackedTouch === null) {
            this.trackedTouch = ev.changedTouches.item(0).identifier;
            this.onScrubStart(ev.currentTarget as HTMLElement);
            this.delayStartZoom(ev.currentTarget as HTMLElement);
        }
    }

    @autobind
    private onTouchEnd(ev: React.TouchEvent) {
        if (this.trackedTouch !== null) {
            const touch = Array.from(ev.changedTouches).find((t) => t.identifier === this.trackedTouch);
            if (touch) {
                this.trackedTouch = null;
                this.onScrubEnd(ev.currentTarget as HTMLElement);
                this.stopZoom(ev.currentTarget as HTMLElement);
            }
        }
    }

    @autobind
    private onMouseUp(ev: React.MouseEvent) {
        this.stopZoom(ev.currentTarget as HTMLElement);
    }

    @autobind
    private onMouseDown(ev: React.MouseEvent) {
        this.delayStartZoom(ev.currentTarget as HTMLElement);
        ev.preventDefault(); // prevent text selection
    }

    render() {
        const friend = this.props.friend;

        let classes = "game-tile";
        let eliminated = false;
        if (this.props.chosen) {
            classes += " game-tile-chosen";
        }
        if (this.props.pendingElimination) {
            classes += " game-tile-pending-elimination";
        }
        if (this.props.eliminated) {
            classes += " game-tile-eliminated";
            eliminated = true;
        }

        return (
            <div
                className={classes}
                onClick={this.props.onClick}
                onMouseMove={this.onMouseMove}
                onMouseOver={this.onMouseOver}
                onMouseOut={this.onMouseOut}
                onMouseDown={this.onMouseDown}
                onMouseUp={this.onMouseUp}
                onTouchMove={this.onTouchMove}
                onTouchStart={this.onTouchStart}
                onTouchEnd={this.onTouchEnd}
                onTouchCancel={this.onTouchEnd}
                tabIndex={this.props.eliminated ? -1 : 0}
            >
                <div className="game-tile-contents" style={{
                    // using a background-image to avoid weird subpixel spacing between image and div's border
                    backgroundImage: `url(${friend.picture!.data.url})`
                }} />
                <div className="game-tile-text">{friend.name}</div>
            </div>
        );
    }
}
