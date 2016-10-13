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

export default class Tile extends React.Component<TileProps, TileState> {

    @autobind
    private onScrubStart(ev: React.MouseEvent) {
        const el = (ev.currentTarget as HTMLElement);
        el.addEventListener("transitionend", this.removeTransition);
    }

    @autobind
    private removeTransition(ev: Event) {
        const el = (ev.currentTarget as HTMLElement);
        el.style.transition = "none";
        el.removeEventListener("transitionend", this.removeTransition);
    }

    @autobind
    private onScrubEnd(ev: React.MouseEvent) {
        const el = (ev.currentTarget as HTMLElement);
        el.classList.remove("active");
        el.style.transform = null;
        el.style.transition = null;
        el.removeEventListener("transitionend", this.removeTransition);
    }

    @autobind
    private onScrubMove(ev: React.MouseEvent) {
        const el = (ev.currentTarget as HTMLElement);
        const rect = el.getBoundingClientRect();
        const xDeg = (((ev.clientY - rect.top) / rect.height) - .5) * 20;
        const yDeg = (((ev.clientX - rect.left) / rect.width) - .5) * 20;
        el.style.transform = `translateZ(10px) rotateY(${-yDeg}deg) rotateX(${xDeg}deg)`;
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
                onMouseMove={this.onScrubMove}
                onMouseOver={this.onScrubStart}
                onMouseOut={this.onScrubEnd}
                // onTouchMove={this.onScrubMove}
                // onTouchStart={this.onScrubStart}
                // onTouchEnd={this.onScrubEnd}
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
