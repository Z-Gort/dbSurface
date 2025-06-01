/* eslint-disable */
// @ts-nocheck

import { type GetPickingInfoParams, type PickingInfo } from "@deck.gl/core";
import { ScatterplotLayer, type ScatterplotLayerProps } from "@deck.gl/layers";
import { type IterableData } from "~/miscellaneousTypes/types";

export interface CustomScatterplotLayerProps
  extends Omit<ScatterplotLayerProps<IterableData>, "data"> {
  data: IterableData | Promise<IterableData>;
  currentHover: { index: number; layerId: string };
}

export class CustomScatterplotLayer extends ScatterplotLayer<
  IterableData,
  CustomScatterplotLayerProps
> {
  static layerName = "CustomScatterplotLayer";

  static defaultProps = {
    ...ScatterplotLayer.defaultProps,
    currentHover: {
      type: "object",
      value: { index: -1, layerId: "" },
    },
  };

  getPickingInfo({
    info,
  }: GetPickingInfoParams<CustomScatterplotLayerProps>): PickingInfo {
    const { index } = info;

    if (
      index >= 0 &&
      (index !== this.props.currentHover.index ||
        this.props.currentHover.layerId !== info.sourceLayer?.id)
    ) {
      const rowObject = {};
      const { src } = this.props.data;
      Object.keys(src).forEach((key) => {
        rowObject[key] = src[key][index];
      });
      info.object = rowObject;
    }

    return info;
  }
}
